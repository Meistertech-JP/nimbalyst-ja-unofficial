import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { auditFiles, applyContextExceptions, compareArchive, auditLinks, isPublicGuide } from './check-publication-content.mjs';

const contextLineHash = line => createHash('sha256').update(line).digest('hex');
const contextConfig = (path,line) => ({version:1,exceptions:[{path,reason:'personal-absolute-path',lineSha256:contextLineHash(line),occurrences:1,classification:'technical-example',rationale:'Synthetic context explicitly reviewed for this test.'}]});

test('context exceptions bind exact path reason and whole line while tolerating line insertion and CRLF',()=>{
  const line='Example directory /home/synthetic-account/project';
  const config=contextConfig('docs/example.md',line);
  const files=[{path:'docs/example.md',text:'# Example\r\n'+line+'\r\n'}];
  const result=applyContextExceptions(files,auditFiles(files),config);
  assert.equal(result.review.length,0);
  assert.deepEqual(result.appliedExceptions,[{path:'docs/example.md',line:2,reason:'personal-absolute-path',classification:'technical-example'}]);
  assert.equal(result.errors.length,0);
  assert.ok(!JSON.stringify(result).includes('synthetic-account'));
  const changed=[{path:'docs/example.md',text:line+' /home/another-account/private'}];
  const mismatch=applyContextExceptions(changed,auditFiles(changed),config);
  assert.equal(mismatch.review.length,1);
  assert.equal(mismatch.errors[0].reason,'stale-context-exception');
  const moved=[{path:'docs/moved.md',text:line}];
  assert.equal(applyContextExceptions(moved,auditFiles(moved),config).review.length,1);
});

test('malformed duplicate disappeared and ambiguous context exceptions fail closed',()=>{
  const line='Example /home/synthetic-account/project', files=[{path:'docs/example.md',text:line}];
  const config=contextConfig(files[0].path,line);
  const invalid=[null,{version:2,exceptions:[]},{version:1,exceptions:'all'},
    {...config,unexpected:true},
    {version:1,exceptions:[{...config.exceptions[0],path:'docs/*.md'}]},
    {version:1,exceptions:[{...config.exceptions[0],reason:'audience-or-wording'}]},
    {version:1,exceptions:[{...config.exceptions[0],lineSha256:'invalid'}]},
    {version:1,exceptions:[{...config.exceptions[0],path:'../example.md'}]},
    {version:1,exceptions:[{...config.exceptions[0],rationale:''}]},
    {version:1,exceptions:[{...config.exceptions[0],occurrences:0}]},
    {version:1,exceptions:[{...config.exceptions[0],occurrences:1.5}]},
  ];
  for(const value of invalid) assert.ok(applyContextExceptions(files,auditFiles(files),value).errors.length>0);
  assert.equal(applyContextExceptions(files,auditFiles(files),{version:1,exceptions:[config.exceptions[0],config.exceptions[0]]}).errors[0].reason,'duplicate-context-exception');
  assert.equal(applyContextExceptions([],auditFiles([]),config).errors[0].reason,'stale-context-exception');
  const twice=[{path:files[0].path,text:line+'\n'+line}];
  assert.equal(applyContextExceptions(twice,auditFiles(twice),config).errors[0].reason,'ambiguous-context-exception');
  const counted={version:1,exceptions:[{...config.exceptions[0],occurrences:2}]};
  assert.equal(applyContextExceptions(twice,auditFiles(twice),counted).appliedExceptions.length,2);
  assert.equal(applyContextExceptions(files,auditFiles(files),counted).errors[0].reason,'stale-context-exception');
  const third=[{path:files[0].path,text:twice[0].text+'\n'+line}];
  assert.equal(applyContextExceptions(third,auditFiles(third),counted).errors[0].reason,'ambiguous-context-exception');
});

test('context exceptions never waive prohibited files or unrelated review reasons',()=>{
  const line='Example /home/synthetic-account/project ご依頼に従って';
  const files=[{path:'docs/example.md',text:line}];
  const result=applyContextExceptions(files,auditFiles(files),contextConfig(files[0].path,line));
  assert.deepEqual(result.review,[{path:files[0].path,line:1,reason:'audience-or-wording'}]);
  const forbidden=[{path:'docs/R17_HANDOFF.md',text:line}];
  const blocked=applyContextExceptions(forbidden,auditFiles(forbidden),contextConfig(forbidden[0].path,line));
  assert.ok(blocked.errors.some(e=>e.reason==='internal-round-record'));
  assert.equal(blocked.review.length,2);
});

test('CLI reads context exception configuration from the audited ref not the current worktree',()=>{
  const dir=mkdtempSync(join(tmpdir(),'publication-context-'));
  const env={...process.env};
  for(const key of Object.keys(env)) if(key.startsWith('GIT_')) delete env[key];
  const git=(...args)=>execFileSync('git',args,{cwd:dir,env,stdio:'pipe'}).toString().trim();
  const run=(...args)=>spawnSync(process.execPath,[fileURLToPath(new URL('./check-publication-content.mjs',import.meta.url)),...args],{cwd:dir,env,encoding:'utf8'});
  const commit=()=>git('-c','user.name=Policy Fixture','-c','user.email=fixture@example.com','-c','core.hooksPath=/dev/null','commit','--quiet','-am','fixture');
  try {
    git('init','--quiet'); mkdirSync(join(dir,'docs')); mkdirSync(join(dir,'scripts'));
    const line='Example /home/synthetic-account/project';
    writeFileSync(join(dir,'docs/example.md'),line+'\n');
    git('add','.'); commit(); const before=git('rev-parse','HEAD');
    writeFileSync(join(dir,'scripts/publication-content-exceptions.json'),JSON.stringify(contextConfig('docs/example.md',line)));
    assert.equal(run('--ref',before).status,1,'untracked current exception must not affect older ref');
    assert.equal(run('--worktree').status,0);
    git('add','.'); commit(); const approved=git('rev-parse','HEAD');
    writeFileSync(join(dir,'scripts/publication-content-exceptions.json'),'invalid JSON');
    assert.equal(run('--ref',approved).status,0,'ref-owned configuration must ignore malformed worktree configuration');
    assert.equal(run('--worktree').status,1);
    assert.equal(run('--ref',before).status,1,'new committed exception must not leak into older ref');
    writeFileSync(join(dir,'scripts/publication-content-exceptions.json'),JSON.stringify(contextConfig('docs/example.md',line)));
    writeFileSync(join(dir,'docs/example.md'),line+' changed\n');
    git('add','.'); commit();
    const stale=run('--ref','HEAD');
    assert.equal(stale.status,1);
    assert.ok(JSON.parse(stale.stdout).errors.some(e=>e.reason==='stale-context-exception'));
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('rejects internal reports and draft trees while preserving product terminology',()=>{
  const result=auditFiles([{path:'R17_FINAL_REPORT_ja.md',text:''},{path:'docs/release-candidates/v1/README.md',text:''},{path:'docs/AI_PROVIDER_TYPES.md',text:'Codex and ChatGPT are providers. ユーザーの指示を受け付けます。'}]);
  assert.equal(result.errors.length,2);
  assert.equal(result.review.length,0);
});
test('rejects generated Electron release trees without rejecting release documentation',()=>{
  const result=auditFiles([
    {path:'packages/electron/release-r20-current-09/win-unpacked/resources/app.asar',text:''},
    {path:'packages/electron/release-r20-current-09/README.md',text:''},
    {path:'packages/electron/release-notes.md',text:'Release notes'},
    {path:'docs/release-guide.md',text:'Release guide'},
  ]);
  assert.deepEqual(result.errors.map(e=>e.reason),['intermediate-release-material','intermediate-release-material']);
});
test('flags personal paths without reproducing their values',()=>{
  const result=auditFiles([{path:'docs/guide.md',text:'C:\\Users\\example\\private\n全ファイル人口'}]);
  assert.deepEqual(result.review.map(x=>x.reason),['personal-absolute-path','audience-or-wording']);
  assert.ok(!JSON.stringify(result).includes('example'));
});

test('Unix personal home paths are redacted candidates even in fenced examples and file URIs',()=>{
  const text='Build at /Users/local-account-2718/project\n```sh\ncd /home/local-account-3141/project\n```\nfile:///Users/local-account-1618/project';
  const result=auditFiles([{path:'docs/guide.mdx',text}]);
  assert.deepEqual(result.review,[
    {path:'docs/guide.mdx',line:1,reason:'personal-absolute-path'},
    {path:'docs/guide.mdx',line:3,reason:'personal-absolute-path'},
    {path:'docs/guide.mdx',line:5,reason:'personal-absolute-path'},
  ]);
  for(const value of ['local-account-2718','local-account-3141','local-account-1618']) assert.ok(!JSON.stringify(result).includes(value));
});

test('Unix home placeholders and ordinary model or URI contexts remain public',()=>{
  const text=[
    '/Users/<user>/project', '/home/<your username>/project',
    '/Users/${USER}/project', '/home/$USER/project', '/home/[username]/project',
    '/Users/your-name/project', '/home/example/project', '/Users/example-user/project',
    '/home/username/project', '/Users/test-user/project', '/home/NAME/project',
    'https://example.test/Users/account/project', 'https://example.test/home/account/project',
    'https://example.test/?target=/home/account/project', 'git@example.test:/home/account/repo',
    'urn:example:/Users/account/project', 'file:///Users/<user>/project',
    '/tmp/home/account/project', 'models/Users/account/project',
    'Codex / Claude Agent / Grok; a user provides instructions.',
  ].join('\n');
  assert.deepEqual(auditFiles([{path:'docs/technical-guide.rst',text}]),{errors:[],review:[]});
});

test('round record prose extensions cannot bypass exclusion by basename or directory moves',()=>{
  const paths=['R17_HANDOFF.mdx','docs/archive/R17_HANDOFF.rst','other/r17_final_report.MDX'];
  const result=auditFiles(paths.map(path=>({path,text:'Local validation notes.'})));
  assert.deepEqual(result.errors,paths.map(path=>({path,reason:'internal-round-record'})));
  assert.deepEqual(auditFiles([{path:'docs/R17.mdx',text:'A product technical reference.'},{path:'docs/README.rst',text:'Codex and ChatGPT integration.'}]),{errors:[],review:[]});
});

test('private incident diaries remain excluded while reusable guidance is allowed',()=>{
  const result=auditFiles([
    {path:'.claude/agent-mistakes.md',text:''},
    {path:'docs/archive/agent-mistakes.md',text:''},
    {path:'docs/DEVELOPMENT_SAFETY.md',text:'Preserve shared work and keep private records outside the public tree.'},
    {path:'.claude/commands/analyze-sessions.md',text:'Review local evidence without publishing it.'},
  ]);
  assert.deepEqual(result.errors.map(row=>row.reason),['private-incident-diary','private-incident-diary']);
  assert.equal(result.review.length,0);
});
test('archive must have the same safe and unique file inventory',()=>{
  assert.deepEqual(compareArchive(['README.md'],['README.md']),{unsafe:[],duplicates:[],missing:[],extra:[]});
  const result=compareArchive(['README.md'],['../secret','R17_FINAL_REPORT.md','R17_FINAL_REPORT.md']);
  assert.equal(result.unsafe.length,1);
  assert.equal(result.duplicates.length,1);
  assert.equal(result.missing.length,1);
  assert.equal(result.extra.length,3);
  assert.equal(compareArchive([],['\\\\server\\share\\file','\\rooted','C:relative','safe/../private','bad\0path']).unsafe.length,5);
});

test('Wiki slugs resolve locally and removed report links are reported',()=>{
  assert.deepEqual(auditLinks([{path:'docs/wiki/Home.md',text:'[English](Home-English)'},{path:'docs/wiki/Home-English.md',text:''}]),[]);
  assert.deepEqual(auditLinks([{path:'README.md',text:'[report](R16_FINAL_REPORT_ja.md)'}]),[{path:'README.md',target:'R16_FINAL_REPORT_ja.md',line:1}]);
  assert.deepEqual(auditLinks([{path:'CONTRIBUTING.md',text:'[protocol](packages/collab-protocol/)'},{path:'packages/collab-protocol/package.json',text:''}]),[]);
  assert.deepEqual(auditLinks([{path:'docs/theme.md',text:'[theme](/packages/electron/THEMING.md)'},{path:'packages/electron/THEMING.md',text:''}]),[]);
});

test('moving a round report to a nested directory does not make it public',()=>{
  assert.equal(auditFiles([{path:'docs/archive/R17_FINAL_REPORT_ja.md',text:''}]).errors.length,1);
});

test('Markdown link examples in fenced code are not navigation',()=>{
  const text='```markdown\n[example](not-a-real-page.md)\n```\n[missing](missing.md)';
  assert.deepEqual(auditLinks([{path:'docs/example.md',text}]),[{path:'docs/example.md',target:'docs/missing.md',line:4}]);
});

test('unmatched inline delimiters cannot consume code examples in a later paragraph',()=>{
  const text='An unmatched ` delimiter.\n \t\nAn example `[missing](ghost.md)` is not navigation.\n[real](missing.md)';
  for (const variant of [text,text.replaceAll('\n','\r\n')]) {
    assert.deepEqual(auditLinks([{path:'README.md',text:variant}]),[{path:'README.md',target:'missing.md',line:4}]);
  }
});

test('reference links and HTML navigation cannot hide missing public-guide targets',()=>{
  const text='[First][Record]\n[record][]\n[record]\n\n[Record]: missing.md "receipt"\n<a href="missing-html.md">HTML</a>\n<img src="missing-image.png">';
  assert.deepEqual(auditLinks([{path:'README.md',text}]),[
    {path:'README.md',target:'missing.md',line:1},
    {path:'README.md',target:'missing.md',line:2},
    {path:'README.md',target:'missing.md',line:3},
    {path:'README.md',target:'missing-html.md',line:6},
    {path:'README.md',target:'missing-image.png',line:7},
  ]);
});

test('Markdown code examples, spaces and balanced destination parentheses retain their meaning',()=>{
  const text='`[code](not-a-page.md)` and ``[second](not-a-page.md)``\n  ```markdown\n[example](not-a-page.md)\n  ```\n[space](<docs/Getting Started.md>)\n[paren](docs/Guide(v1).md "version")\n[escaped](docs/Guide\\(v1\\).md)\n[missing](missing.md)';
  assert.deepEqual(auditLinks([
    {path:'README.md',text},
    {path:'docs/Getting Started.md',text:''},
    {path:'docs/Guide(v1).md',text:''},
  ]),[{path:'README.md',target:'missing.md',line:8}]);
});

test('maintained documentation index is mandatory and guide names match exactly',()=>{
  assert.equal(isPublicGuide('docs/README.md'),true);
  assert.equal(isPublicGuide('README.md.bak'),false);
  assert.equal(isPublicGuide('docs/WIKI_SOURCES.md.old'),false);
});

test('nested intermediate drafts and every inventoried prose extension are audited',()=>{
  const result=auditFiles([
    {path:'docs/archive/release-candidates/v1/README.md',text:''},
    {path:'archive/Release-Qualified/v1/README.md',text:''},
    {path:'docs/guide.mdx',text:'ご依頼に従って'},
    {path:'docs/guide.rst',text:'ご指摘のとおり'},
  ]);
  assert.deepEqual(result.errors.map(x=>x.reason),['intermediate-release-material','intermediate-release-material']);
  assert.deepEqual(result.review.map(x=>x.path),['docs/guide.mdx','docs/guide.rst']);
});

test('Windows archive extraction rejects collisions and unsafe component names',()=>{
  const paths=['README.md','readme.md','docs/name:stream.md','docs/CON.txt','docs/LPT1','docs/name.','docs/name ','docs\\file.md','docs/a?.md','docs//file.md'];
  const result=compareArchive(paths,paths);
  assert.deepEqual(result.duplicates,['readme.md']);
  assert.deepEqual(result.unsafe,paths.slice(2));
  assert.deepEqual(compareArchive(['docs/日本語.md','docs/COM11.md'],['docs/日本語.md','docs/COM11.md']),{unsafe:[],duplicates:[],missing:[],extra:[]});
});

test('CLI rejects a forbidden committed tree and audits a repaired worktree separately',()=>{
  const dir=mkdtempSync(join(tmpdir(),'publication-policy-'));
  const env={...process.env};
  for(const key of Object.keys(env)) if(key.startsWith('GIT_')) delete env[key];
  const git=(...args)=>execFileSync('git',args,{cwd:dir,env,stdio:'pipe'});
  const script=new URL('./check-publication-content.mjs',import.meta.url);
  const run=(...args)=>spawnSync(process.execPath,[fileURLToPath(script),...args],{cwd:dir,env,encoding:'utf8'});
  try{
    git('init','--quiet');
    writeFileSync(join(dir,'README.md'),'# Public product\n');
    mkdirSync(join(dir,'docs'));
    writeFileSync(join(dir,'docs/R17_HANDOFF.md'),'private checkpoint\n');
    git('add','README.md','docs/R17_HANDOFF.md');
    git('-c','user.name=Policy Fixture','-c','user.email=fixture@example.com','-c','core.hooksPath=/dev/null','commit','--quiet','-m','fixture');
    const red=run('--ref','HEAD');
    assert.ifError(red.error);
    assert.equal(red.status,1);
    assert.equal(JSON.parse(red.stdout).errors[0].reason,'internal-round-record');
    rmSync(join(dir,'docs/R17_HANDOFF.md'));
    const green=run('--worktree');
    assert.ifError(green.error);
    assert.equal(green.status,0,green.stderr);
    assert.equal(JSON.parse(green.stdout).ref,'WORKTREE');
    assert.equal(run('--ref','HEAD').status,1,'committed report must still fail after worktree removal');
    writeFileSync(join(dir,'README.md'),'[missing guide](missing-guide.md)\n');
    const broken=run('--worktree');
    assert.equal(broken.status,1);
    assert.equal(JSON.parse(broken.stdout).brokenPublicGuideLinks.length,1);
    writeFileSync(join(dir,'README.md'),'# Public product\n');
    writeFileSync(join(dir,'docs/README.md'),'[removed][report]\n\n[report]: missing.md\n');
    const brokenIndex=run('--worktree');
    assert.equal(brokenIndex.status,1);
    assert.equal(JSON.parse(brokenIndex.stdout).brokenPublicGuideLinks[0].path,'docs/README.md');
    rmSync(join(dir,'docs/README.md'));
    writeFileSync(join(dir,'docs/guide.mdx'),'ご依頼に従って\n');
    const proseReview=run('--worktree');
    assert.equal(proseReview.status,1);
    assert.equal(JSON.parse(proseReview.stdout).review[0].path,'docs/guide.mdx');
    rmSync(join(dir,'docs/guide.mdx'));
    // Keep the entry list outside the candidate so it cannot change the
    // population it describes, just like the release archive inventory.
    const listDir=mkdtempSync(join(tmpdir(),'publication-entries-'));
    try {
      const list=join(listDir,'entries.txt');
      writeFileSync(list,'README.md\n../private\n');
      const badArchive=run('--worktree','--archive-list',list);
      assert.equal(badArchive.status,1);
      assert.equal(JSON.parse(badArchive.stdout).archive.unsafe.length,1);
      writeFileSync(list,'\uFEFFREADME.md\n');
      assert.equal(run('--worktree','--archive-list',list).status,0);
      assert.notEqual(run('--worktree','--archive-list').status,0);
    } finally { rmSync(listDir,{recursive:true,force:true}); }
  }finally{rmSync(dir,{recursive:true,force:true});}
});
