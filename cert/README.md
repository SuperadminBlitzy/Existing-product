# SSL Certificate Generation for Development HTTPS

This directory contains documentation and scripts for generating self-signed SSL certificates required for the development HTTPS server implementation.

## Overview

The hao-backprop-test application has been enhanced with HTTPS support as part of security vulnerability remediation. For development environments, self-signed certificates provide adequate encryption without requiring Certificate Authority (CA) validation.

**⚠️ DEVELOPMENT ONLY**: These certificates are suitable only for development and testing environments. Never use self-signed certificates in production environments.

## Prerequisites

- **OpenSSL**: Required for certificate generation
  - Windows: Install via [Win64 OpenSSL](https://slproweb.com/products/Win32OpenSSL.html) or WSL
  - macOS: Install via Homebrew: `brew install openssl`
  - Linux: Usually pre-installed, or install via package manager: `sudo apt-get install openssl`

- **Node.js 16.x**: Required for the HTTPS server
- **Write permissions**: To this `cert/` directory

## Certificate Generation Commands

### Quick Certificate Generation

Generate both private key and certificate with a single command:

```bash
# Navigate to the cert directory
cd cert/

# Generate private key and certificate in one command
openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.cert -days 365 -nodes -subj "/C=US/ST=Development/L=Local/O=Test/OU=DevTeam/CN=localhost"
```

### Step-by-Step Certificate Generation

For more control over the process:

```bash
# 1. Generate a 2048-bit RSA private key
openssl genrsa -out server.key 2048

# 2. Generate a certificate signing request (CSR)
openssl req -new -key server.key -out server.csr -subj "/C=US/ST=Development/L=Local/O=Test/OU=DevTeam/CN=localhost"

# 3. Generate the self-signed certificate (365 days validity)
openssl x509 -req -in server.csr -signkey server.key -out server.cert -days 365

# 4. Clean up the CSR (optional)
rm server.csr
```

### Certificate with Subject Alternative Names (SAN)

For enhanced compatibility with modern browsers:

```bash
# Create a config file for SAN extension
cat > server.conf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=Development
L=Local
O=Test Organization
OU=Development Team
CN=localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
EOF

# Generate key and certificate with SAN
openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.cert -days 365 -nodes -config server.conf -extensions v3_req

# Clean up config file
rm server.conf
```

## Certificate Validation

### Verify Certificate Contents

```bash
# View certificate details
openssl x509 -in server.cert -text -noout

# Check certificate validity dates
openssl x509 -in server.cert -noout -dates

# Verify certificate matches private key
openssl x509 -noout -modulus -in server.cert | openssl md5
openssl rsa -noout -modulus -in server.key | openssl md5
# The MD5 hashes should match
```

### Test HTTPS Connection

```bash
# Test certificate with OpenSSL client (after server is running)
openssl s_client -connect localhost:3443 -servername localhost

# Test with curl (ignore certificate warnings for self-signed)
curl -k https://localhost:3443
```

## File Permissions and Security

### Secure File Permissions

```bash
# Set secure permissions for private key (owner read-only)
chmod 600 server.key

# Set standard permissions for certificate (world-readable)
chmod 644 server.cert

# Verify permissions
ls -la server.key server.cert
```

### Expected Output

```
-rw------- 1 user user 1704 Dec  1 10:00 server.key
-rw-r--r-- 1 user user 1367 Dec  1 10:00 server.cert
```

## Integration with HTTPS Server

The generated certificates integrate with the Express HTTPS server as follows:

```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
  key: fs.readFileSync(path.join(__dirname, 'cert', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'cert', 'server.cert'))
};

const httpsServer = https.createServer(options, app);
httpsServer.listen(3443, '127.0.0.1', () => {
  console.log('HTTPS Server running on https://127.0.0.1:3443/');
});
```

## Certificate Renewal

### Renewal Schedule

- **Development certificates**: Renew every 365 days (or as needed)
- **Check expiration**: Use `openssl x509 -in server.cert -noout -dates`
- **Renewal notification**: Certificate expires warnings will appear in browser/logs

### Automated Renewal Script

Create a renewal script for convenience:

```bash
#!/bin/bash
# save as renew-cert.sh in cert directory

echo "Renewing development SSL certificate..."

# Backup existing certificates
cp server.key server.key.backup.$(date +%Y%m%d)
cp server.cert server.cert.backup.$(date +%Y%m%d)

# Generate new certificate
openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.cert -days 365 -nodes -subj "/C=US/ST=Development/L=Local/O=Test/OU=DevTeam/CN=localhost"

# Set permissions
chmod 600 server.key
chmod 644 server.cert

echo "Certificate renewed successfully. Valid for 365 days."
echo "Restart the HTTPS server to use the new certificate."
```

Make the script executable: `chmod +x renew-cert.sh`

## Security Considerations

### Development Environment Security

- **Localhost Binding**: Certificates are configured for localhost/127.0.0.1 only
- **Private Key Protection**: Keep `server.key` secure with 600 permissions
- **Certificate Transparency**: Self-signed certificates don't appear in CT logs
- **Browser Warnings**: Browsers will show security warnings for self-signed certificates

### Security Best Practices

1. **Never commit private keys** to version control
2. **Regenerate certificates** if private key is compromised
3. **Use separate certificates** for different development environments
4. **Monitor certificate expiration** to avoid service interruption
5. **Document certificate purposes** and renewal procedures

### Browser Security Warnings

When accessing `https://localhost:3443`, browsers will display warnings such as:
- "Your connection is not private"
- "NET::ERR_CERT_AUTHORITY_INVALID"
- "This certificate is not from a trusted authority"

These warnings are expected and safe to bypass in development environments.

## Troubleshooting

### Common Certificate Issues

**Issue: "ENOENT: no such file or directory" when starting HTTPS server**
- Solution: Ensure both `server.key` and `server.cert` exist in the `cert/` directory
- Verify file paths in the server configuration

**Issue: "Error: EACCES: permission denied"**
- Solution: Check file permissions with `ls -la server.key server.cert`
- Set correct permissions: `chmod 600 server.key && chmod 644 server.cert`

**Issue: Browser shows "ERR_SSL_KEY_USAGE_INCOMPATIBLE"**
- Solution: Regenerate certificate ensuring RSA key usage is compatible
- Use the SAN configuration method for better browser compatibility

**Issue: "Certificate has expired"**
- Solution: Check certificate validity with `openssl x509 -in server.cert -noout -dates`
- Regenerate certificate using renewal commands above

### OpenSSL Installation Issues

**Windows: "openssl is not recognized"**
- Install OpenSSL for Windows or use WSL (Windows Subsystem for Linux)
- Add OpenSSL to system PATH environment variable

**macOS: OpenSSL version conflicts**
- Use Homebrew OpenSSL: `/usr/local/opt/openssl/bin/openssl`
- Set alias: `alias openssl='/usr/local/opt/openssl/bin/openssl'`

## Production Certificate Requirements

When deploying to production environments, replace self-signed certificates with CA-signed certificates:

### Certificate Authority Options

- **Let's Encrypt**: Free automated certificates
- **Commercial CAs**: Extended validation certificates
- **Internal CAs**: For enterprise environments

### Production Checklist

- [ ] Obtain CA-signed certificate
- [ ] Configure certificate auto-renewal
- [ ] Update certificate monitoring
- [ ] Remove self-signed certificate warnings from documentation
- [ ] Implement certificate validation in deployment pipeline

## Environment-Specific Configuration

### Development Environment
- Certificate validity: 365 days
- Renewal: Manual or automated script
- Subject: localhost/127.0.0.1
- Key size: 2048-bit RSA

### Testing Environment
- Consider using staging CA certificates
- Automated renewal recommended
- Subject: test domain names
- Monitor certificate expiration

### Production Environment
- CA-signed certificates required
- Automated renewal mandatory
- Subject: production domain names
- Enhanced key sizes (4096-bit) for sensitive applications

## References

- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [RFC 5280: Internet X.509 Public Key Infrastructure](https://tools.ietf.org/html/rfc5280)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

## Support

For certificate generation issues:
1. Check OpenSSL installation and version
2. Verify file system permissions
3. Consult OpenSSL error messages and documentation
4. Consider using alternative certificate generation tools if needed

---

**Last Updated**: Created for hao-backprop-test HTTPS security enhancement
**Certificate Validity**: 365 days from generation
**Environment**: Development only - not for production use