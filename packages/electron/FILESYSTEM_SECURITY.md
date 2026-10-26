# Filesystem Security Documentation

## Overview

This document describes path validation used by `ElectronFileSystemService` when its read, list, and search APIs access the local filesystem. It is not a description of an OS sandbox or a guarantee that every editor, external agent, terminal command, or filesystem API uses this boundary. Static path validation alone does not establish symlink confinement or runtime acceptance on each operating system.

## Security Architecture

### 1. SafePathValidator

The `SafePathValidator` class (`src/main/security/SafePathValidator.ts`) validates paths supplied to this service before those operations proceed.

**Key Features:**
- Path traversal prevention (blocks `..`, absolute paths)
- Command injection prevention (blocks shell metacharacters)
- Forbidden path detection (rejects the configured directory patterns)
- File extension filtering (blocks sensitive file types)
- Service access-log entries and diagnostic logging

### 2. Security Boundaries

The validator rejects absolute paths and traversal syntax and resolves accepted relative paths against the selected workspace. These lexical checks are not a proof that symlinks, other filesystem APIs, or external tools cannot reach outside that directory:

```typescript
// Valid paths (within workspace)
✅ "src/app.js"
✅ "components/Button.tsx"
✅ "docs/README.md"

// Blocked paths (security violations)
❌ "../../../etc/passwd"          // Path traversal
❌ "/home/user/.ssh/id_rsa"       // Absolute path
❌ ".ssh/config"                   // Forbidden directory
❌ "secrets.pem"                   // Blocked extension
❌ "file$(whoami).txt"            // Command injection
```

### 3. Defense in Depth

The service combines several checks; these do not replace an OS-level sandbox:

1. **Input Validation**: Supplied service paths are validated before processing
2. **Path Normalization**: Paths are lexically normalized and resolved
3. **Workspace-relative Checks**: The resolved path is checked against the configured workspace; symlink behavior needs separate verification
4. **Command Safety**: Using `execFile` instead of `exec` to prevent shell injection
5. **Logging**: The service records access attempts in a bounded in-memory log
6. **Log Bound**: Old entries are discarded when the log reaches its entry limit; this is not an operation-rate limiter

## Protected Resources

### Forbidden Directories
- `.ssh` - SSH keys and configurations
- `.aws` - AWS credentials
- `.gnupg` - GPG keys
- `.docker` - Docker configurations
- `.kube` - Kubernetes configs
- `Library/Keychains` - macOS keychains
- `Library/Cookies` - Browser cookies
- Browser profile directories

### Blocked File Types
- `.pem`, `.key`, `.cert`, `.crt` - Certificates and keys
- `.env`, `.env.local`, `.env.production` - Explicitly blocked environment-file basenames; this is not a wildcard block of every `.env.*` name
- `.sqlite`, `.db` - Database files
- `.wallet` - Cryptocurrency wallets
- `.keychain`, `.keystore` - Key stores

## Implementation Details

### Path Validation Flow

1. **Input Reception**: Path received from AI tool
2. **Pattern Checking**: Check for dangerous patterns (`.`, `$`, etc.)
3. **Path Resolution**: Safely resolve path within workspace
4. **Boundary Check**: Verify resolved path stays within workspace
5. **Extension Check**: Verify file type is allowed
6. **Access Logging**: Log the access attempt
7. **Operation Execution**: Perform the filesystem operation if valid

### Command Execution Safety

Instead of using shell command interpolation:
```javascript
// ❌ DANGEROUS - Command injection possible
exec(`rg "${query}" "${path}"`);
```

We use argument arrays with execFile:
```javascript
// ✅ SAFE - No shell interpretation
execFile('rg', [query, path]);
```

## Testing

Comprehensive security tests are located in:
- `src/main/security/__tests__/SafePathValidator.test.ts`
- `src/main/services/__tests__/ElectronFileSystemService.security.test.ts`

These tests verify protection against:
- Path traversal attacks
- Command injection attempts
- Unauthorized access to sensitive files
- Edge cases and malformed inputs

## Security Monitoring

### Access Logs

The service's in-memory access-log entries contain:
- Timestamp
- Shortened path (the last two components)
- Operation type (read, list, search)
- Success/failure status

Access logs can be retrieved via:
```typescript
const logs = fileSystemService.getAccessLog(100); // Last 100 entries
```

Other diagnostic messages, including validator failures, can contain input or resolved paths. The shortened access log does not guarantee that all diagnostic logs are sanitized. Review logs before sharing them and do not include credentials or personal file contents.

### Failed Access Alerts

Failed access attempts are logged at WARNING level for security monitoring:
```
[FileSystemService] Access denied: {
  timestamp: "2024-01-15T10:30:00Z",
  path: ".../etc/passwd",
  operation: "read",
  success: false
}
```

## Best Practices

1. **Never trust user input**: All paths must be validated
2. **Fail securely**: Deny access by default
3. **Log everything**: Maintain audit trail
4. **Minimize exposure**: Only expose necessary operations
5. **Regular updates**: Keep security measures current

## Incident Response

If a security violation is detected:

1. **Access is denied** immediately
2. **Violation is logged** with full details
3. **Error returned** to caller without exposing system details
4. **Monitor logs** for repeated attempts

## Future Enhancements

Potential future security improvements:
- [ ] Add rate limiting per operation type
- [ ] Implement file content scanning for sensitive data
- [ ] Add webhook notifications for security events
- [ ] Implement temporary access tokens for operations
- [ ] Add file integrity monitoring

## Contact

Use the repository's [security policy](../../SECURITY.md) for reporting guidance. Do not publish credentials or sensitive diagnostic logs in a public issue.
