import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const AUDIT_TEXT = /\.(?:md|mdx|rst|txt|json|ya?ml)$/i;
const CONTEXT_CONFIG = 'scripts/publication-content-exceptions.json';

export function classifyPath(path) {
  if (/(?:^|\/)agent-mistakes\.md$/i.test(path)) return 'private-incident-diary';
  if (/(?:^|\/)R\d+_[^/]+\.(?:md|mdx|rst|json|txt)$/i.test(path)) return 'internal-round-record';
  if (/(?:^|\/)release-(?:candidates|qualified)\//i.test(path)) return 'intermediate-release-material';
  if (/^packages\/electron\/release-r\d+(?:-[^/]+)?\//i.test(path)) return 'intermediate-release-material';
  if (/(?:^|\/)(?:node_modules|\.git|private-evidence|publication-receipts)\//.test(path)) return 'private-or-generated-directory';
  return null;
}

function isLocalPathContext(line,index) {
  const prefix=line.slice(0,index).match(/[^\s"'`<>()\[\]]*$/)?.[0]??'';
  const fileUri=/^file:\/\/(?:localhost)?\/?$/i.test(prefix);
  // An HTTP/SSH/URN path is not a local profile path. Local file:// URIs are
  // intentionally included: putting a personal path in a URI must not hide it.
  if ((/^[a-z][a-z\d+.-]*:/i.test(prefix) || /^[^\s/\\:]+@[^\s/\\:]+:/.test(prefix)) && !fileUri) return false;
  return fileUri || index===0 || /[\s"'`(<\[=:*_]/.test(line[index-1]);
}

function isHomePlaceholder(segment) {
  // Only generic template syntax/names are exempt. Never add a real account
  // name here to make a candidate pass; contextual exceptions need review.
  return /^(?:<[^<>]+>|\$\{[^}]+\}|\$[a-z_]\w*|\[[^\]]+\]|%[^%]+%|user(?:name)?|your[-_](?:name|user(?:name)?)|example(?:[-_]user)?|test[-_]user|name|placeholder|\.{3})$/i.test(segment);
}

function hasPersonalAbsolutePath(line) {
  // Include JSON-escaped separators as well as ordinary Windows paths.
  for (const match of line.matchAll(/[a-z]:[\\/]+(?:Users[\\/]+[^\s/\\]+|Private_Dev(?:[\\/]|$))/gi)) {
    if (isLocalPathContext(line,match.index)) return true;
  }
  for (const match of line.matchAll(/\/(?:Users|home)\/(<[^>\r\n/]+>|\$\{[^}\r\n/]+\}|\[[^\]\r\n/]+\]|[^/\\\s"'`<>()[\]{}]+)/g)) {
    if (isLocalPathContext(line,match.index) && !isHomePlaceholder(match[1])) return true;
  }
  return false;
}

export function auditFiles(files) {
  const errors = [], review = [];
  for (const { path, text } of files) {
    const reason = classifyPath(path);
    if (reason) errors.push({ path, reason });
    if (!AUDIT_TEXT.test(path)) continue;
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      if (hasPersonalAbsolutePath(line)) review.push({path,line:index+1,reason:'personal-absolute-path'});
      if (/ご依頼に従って|ご指摘のとおり|次のセッションへ|所有者から指示|今回の公開指示|ファイル人口/.test(line)) review.push({path,line:index+1,reason:'audience-or-wording'});
      if (/source-only preview policy|v0\.82\.3-ja\.1.{0,20}未公開/.test(line)) review.push({path,line:index+1,reason:'stale-publication-state'});
    }
  }
  return { errors, review };
}

export function applyContextExceptions(files, audit, config) {
  const errors = [...audit.errors], appliedExceptions = [];
  const fail = (reason,entry) => errors.push({path:CONTEXT_CONFIG,reason,...(entry===undefined?{}:{entry})});
  const exactKeys = (value,keys) => value && typeof value==='object' && !Array.isArray(value)
    && Object.keys(value).length===keys.length && keys.every(key=>Object.hasOwn(value,key));
  if (!exactKeys(config,['version','exceptions']) || config.version!==1 || !Array.isArray(config.exceptions)) {
    fail('invalid-context-exception-config');
    return {errors,review:audit.review,appliedExceptions};
  }
  const seen = new Set(), matches = [];
  for (const [index,entry] of config.exceptions.entries()) {
    if (!exactKeys(entry,['path','reason','lineSha256','occurrences','classification','rationale'])
      || typeof entry.path!=='string' || !entry.path || entry.path.startsWith('/')
      || /[\\:*?\[\]<>|\x00-\x1f]/.test(entry.path)
      || entry.path.split('/').some(part=>!part || part==='.' || part==='..')
      || entry.reason!=='personal-absolute-path'
      || typeof entry.lineSha256!=='string' || !/^[a-f\d]{64}$/.test(entry.lineSha256)
      || !Number.isSafeInteger(entry.occurrences) || entry.occurrences<1
      || typeof entry.classification!=='string' || !/^[a-z][a-z\d-]{0,99}$/.test(entry.classification)
      || typeof entry.rationale!=='string' || !entry.rationale.trim() || entry.rationale.length>1000
      || classifyPath(entry.path)) {
      fail('invalid-context-exception',index); continue;
    }
    const key=JSON.stringify([entry.path,entry.reason,entry.lineSha256]);
    if (seen.has(key)) { fail('duplicate-context-exception',index); continue; }
    seen.add(key);
    const file=files.find(file=>file.path===entry.path);
    const lines=file?.text.split(/\r?\n/);
    const candidates=audit.review.filter(candidate=>candidate.path===entry.path && candidate.reason===entry.reason
      && createHash('sha256').update(lines?.[candidate.line-1]??'').digest('hex')===entry.lineSha256);
    if (candidates.length!==entry.occurrences) {
      fail(candidates.length>entry.occurrences?'ambiguous-context-exception':'stale-context-exception',index); continue;
    }
    for (const candidate of candidates) matches.push({candidate,classification:entry.classification});
  }
  // An invalid or stale configuration never partially exempts other findings.
  if (errors.length!==audit.errors.length) return {errors,review:audit.review,appliedExceptions};
  const waived = new Set(matches.map(match=>match.candidate));
  for (const {candidate,classification} of matches) appliedExceptions.push({...candidate,classification});
  return {errors,review:audit.review.filter(candidate=>!waived.has(candidate)),appliedExceptions};
}

export function compareArchive(expected, actual) {
  // ZIP names are canonical slash-separated paths. Reject Windows aliases,
  // devices and alternate streams before a restore can overwrite another file.
  const unsafe = actual.filter(p => p.includes('\\') || /[<>:"|?*\x00-\x1f]/.test(p) || p.split('/').some(part =>
    !part || part === '.' || part === '..' || /[. ]$/.test(part) ||
    /^(?:con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part)));
  const expectedSet = new Set(expected), actualSet = new Set(actual), seen = new Set();
  const duplicates = actual.filter(p=>{
    const key=p.normalize('NFC').toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
  return { unsafe, duplicates, missing: expected.filter(p=>!actualSet.has(p)), extra:actual.filter(p=>!expectedSet.has(p)) };
}

const mask = text => text.replace(/[^\n]/g,' ');
const unescapeMarkdown = text => text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g,'$1');
const referenceKey = text => unescapeMarkdown(text).trim().replace(/\s+/g,' ').toLowerCase();
const isEscaped = (text,index) => {
  let slashes=0;
  while (index>0 && text[--index]==='\\') slashes++;
  return slashes%2===1;
};

function maskCode(text) {
  let fence=null;
  let prose=text.split(/(?<=\n)/).map(line=>{
    const run=/^ {0,3}(`{3,}|~{3,})([^\n]*)/.exec(line);
    if (fence) {
      if (run && run[1][0]===fence.char && run[1].length>=fence.length && !run[2].trim()) fence=null;
      return mask(line);
    }
    if (run) { fence={char:run[1][0],length:run[1].length}; return mask(line); }
    return line;
  }).join('').replace(/<!--[\s\S]*?(?:-->|$)/g,mask);
  // Code spans close with a run of the same length. Keep source offsets and
  // newlines so every reported location still identifies the original line.
  for (let i=0;i<prose.length;i++) {
    if (prose[i]!=='`' || isEscaped(prose,i)) continue;
    let length=1;
    while (prose[i+length]==='`') length++;
    const delimiter='`'.repeat(length);
    let close=prose.indexOf(delimiter,i+length);
    while (close>=0 && (prose[close-1]==='`' || prose[close+length]==='`')) close=prose.indexOf(delimiter,close+length);
    // An unmatched delimiter in a prior paragraph is literal text, not an
    // opener spanning later blocks. Otherwise a historical unmatched tick can
    // invert masking for every subsequent code example in a long document.
    if (close>=0 && /\r?\n[ \t]*\r?\n/.test(prose.slice(i,close))) close=-1;
    if (close>=0) { prose=prose.slice(0,i)+mask(prose.slice(i,close+length))+prose.slice(close+length); i=close+length-1; }
    else i+=length-1;
  }
  return prose;
}

function readDestination(text,start) {
  let i=start;
  while (/\s/.test(text[i]??'') && i<text.length) i++;
  const begin=i;
  if (text[i]==='<') {
    i++;
    while (i<text.length && text[i]!=='\n' && (text[i]!=='>' || isEscaped(text,i))) i++;
    if (text[i]!=='>') return null;
    return {url:unescapeMarkdown(text.slice(begin+1,i)),end:i+1};
  }
  let depth=0;
  while (i<text.length && !/\s/.test(text[i])) {
    if (text[i]==='\\' && i+1<text.length) { i+=2; continue; }
    if (text[i]==='(') depth++;
    if (text[i]===')') { if (!depth) break; depth--; }
    i++;
  }
  return depth ? null : {url:unescapeMarkdown(text.slice(begin,i)),end:i};
}

function inlineLinkEnd(text,destinationEnd) {
  let i=destinationEnd;
  while (/\s/.test(text[i]??'') && i<text.length) i++;
  if (text[i]===')') return i;
  const opening=text[i], closing=opening==='(' ? ')' : opening;
  if (!['"',"'",'('].includes(opening)) return -1;
  i++;
  while (i<text.length && (text[i]!==closing || isEscaped(text,i))) i++;
  if (i===text.length) return -1;
  i++;
  while (/\s/.test(text[i]??'') && i<text.length) i++;
  return text[i]===')' ? i : -1;
}

const decodeHtml = text => text.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi,(entity,key)=>{
  if (key[0]!=='#') return {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'}[key.toLowerCase()];
  const value=key[1].toLowerCase()==='x' ? parseInt(key.slice(2),16) : parseInt(key.slice(1),10);
  return value>0 && value<=0x10ffff ? String.fromCodePoint(value) : entity;
});

// Handles guide navigation forms without a dependency install. This is not a
// complete CommonMark/MDX/RST parser or a substitute for contextual review.
export function extractLinkCandidates(text) {
  let prose=maskCode(text);
  const definitions=new Map(), links=[];
  const add=(url,index)=>links.push({url,line:text.slice(0,index).split('\n').length,index});
  prose=prose.replace(/^ {0,3}\[([^\]\n]+)\]:[ \t]*(.*)$/gm,(whole,label,body)=>{
    const destination=readDestination(body,0), key=referenceKey(label);
    if (destination && !definitions.has(key)) definitions.set(key,destination.url);
    return mask(whole);
  });
  prose=prose.replace(/<(?:a|img|area|link)\b[^>]*>/gi,(tag,index)=>{
    for (const attribute of tag.matchAll(/\s(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)) {
      add(decodeHtml(attribute[1]??attribute[2]??attribute[3]),index);
    }
    return mask(tag);
  });
  for (let i=0;i<prose.length;i++) {
    if (prose[i]!=='[' || isEscaped(prose,i)) continue;
    let end=i+1, depth=1;
    for (;end<prose.length;end++) {
      if (isEscaped(prose,end)) continue;
      if (prose[end]==='[') depth++;
      if (prose[end]===']' && --depth===0) break;
    }
    if (depth) continue;
    const label=prose.slice(i+1,end);
    if (prose[end+1]==='(') {
      const destination=readDestination(prose,end+2);
      const close=destination ? inlineLinkEnd(prose,destination.end) : -1;
      if (close>=0) { add(destination.url,i); i=close; continue; }
    }
    let key=referenceKey(label), after=end+1;
    if (prose[after]==='[') {
      const close=prose.indexOf(']',after+1);
      if (close>=0) { key=referenceKey(prose.slice(after+1,close))||key; end=close; }
    }
    if (definitions.has(key)) add(definitions.get(key),i);
    i=end;
  }
  return links.sort((a,b)=>a.index-b.index).map(({url,line})=>({url,line}));
}

export function auditLinks(files) {
  const paths = new Set(files.map(f=>f.path));
  const broken = [];
  for (const {path,text} of files.filter(f=>/\.(?:md|mdx)$/i.test(f.path))) {
    for (const {url,line} of extractLinkCandidates(text)) {
      if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(url)) continue;
      let clean;
      try { clean=decodeURIComponent(url.split(/[?#]/)[0]); } catch { broken.push({path,line,reason:'invalid-link-encoding'}); continue; }
      if (!clean) continue;
      let target=(clean.startsWith('/') ? posix.normalize(clean.slice(1)) : posix.normalize(posix.join(posix.dirname(path),clean))).replace(/\/$/,'');
      if (path.startsWith('docs/wiki/') && !posix.extname(clean)) target += '.md';
      if (paths.has(target) || [...paths].some(p=>p.startsWith(target+'/'))) continue;
      broken.push({path,target,line});
    }
  }
  return broken;
}

export function isPublicGuide(path) {
  return /^(?:README(?:\.en)?\.md|RELEASE_NOTES_[^/]+\.md|docs\/(?:README\.md|wiki\/.+|UNOFFICIAL_RELEASE\.md|WINDOWS_JA_UNOFFICIAL\.md|WIKI_SOURCES\.md))$/.test(path);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    if (!args.includes(name)) return fallback;
    const value = args[args.indexOf(name)+1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`);
    return value;
  };
  const git = (...args) => execFileSync('git', args, {encoding:'utf8',maxBuffer:64*1024*1024});
  const ref = option('--ref','HEAD');
  const worktree = args.includes('--worktree');
  const paths = worktree
    ? git('ls-files','--cached','--others','--exclude-standard','-z').split('\0').filter(p=>p && existsSync(p))
    : git('ls-tree','-r','--name-only','-z',ref).split('\0').filter(Boolean);
  const files = paths.map(path=>({path,text:AUDIT_TEXT.test(path)?(worktree?readFileSync(path,'utf8'):git('show',`${ref}:${path}`)):''}));
  const audit=auditFiles(files);
  // Read from the exact population being audited, never a current-worktree
  // exception file when inspecting a different commit or an outgoing tag.
  const contextFile=files.find(file=>file.path===CONTEXT_CONFIG);
  let contextConfig={version:1,exceptions:[]};
  try { if (contextFile) contextConfig=JSON.parse(contextFile.text); }
  catch { contextConfig=null; }
  const report = { ref:worktree?'WORKTREE':ref, files:paths.length, ...applyContextExceptions(files,audit,contextConfig) };
  // Maintained edition guides are a mandatory gate; inherited design examples
  // are additionally reported by --links for contextual review.
  const links = auditLinks(files);
  report.brokenPublicGuideLinks = links.filter(link=>isPublicGuide(link.path));
  if (args.includes('--links')) report.brokenLinks = links;
  const base = option('--base');
  if (base) report.changes = (worktree ? git('diff','--name-status',base) : git('diff','--name-status',`${base}..${ref}`)).trim().split('\n');
  if (worktree) report.untracked = git('ls-files','--others','--exclude-standard','-z').split('\0').filter(Boolean);
  const list = option('--archive-list');
  if (list) report.archive = compareArchive(paths,readFileSync(list,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(Boolean));
  console.log(JSON.stringify(report,null,2));
  const archiveFailed = report.archive && Object.values(report.archive).some(a=>a.length);
  process.exitCode = report.errors.length || report.review.length || report.brokenPublicGuideLinks.length || archiveFailed ? 1 : 0;
}
