# Security Policy

## Repository hardening baseline

This repository is prepared to be published as a public GitHub repository with a focus on preventing accidental secret exposure.

### Controls implemented

- `.env` and environment override files are ignored globally.
- Common private key/certificate formats (`.pem`, `.key`, `.p12`, `.pfx`) are ignored globally.
- Automatic secret scanning runs in GitHub Actions (`.github/workflows/secret-scan.yml`) on push and pull requests.
- Local code-dump utility (`dumpear.ps1`) excludes sensitive filenames/patterns by default.
- Docker Compose no longer allows MySQL empty root password by default.

## Operational recommendations

1. Rotate any credential that may have existed in local clones before making the repo public.
2. Use distinct credentials per environment (dev/staging/prod).
3. Keep production secrets only in secret managers or CI/CD encrypted variables.
4. Require branch protection + status checks, including the secret scan workflow.
5. Enable GitHub Advanced Security / secret scanning alerts (if available for your plan).

## Reporting

If you discover a security issue, please avoid opening a public issue with exploit details. Share a private report with maintainers first.
