# Going live: hosting MuleCheck

The app needs three things that a plain static host cannot give you: a Node server, a database, and a disk for the evidence screenshots. Pick one of the two paths below.

## Path A (recommended): one VPS with Docker

Works on Hostinger VPS, DigitalOcean, Hetzner, Linode, AWS Lightsail. A 1 vCPU / 2 GB plan is enough to start (roughly Rs 400 to 800 per month).

1. **Buy a VPS** running Ubuntu 22.04 or 24.04. Note its public IP.
2. **Point your domain** at it: in your domain registrar add an `A` record for `mulecheck.tech` (and `www`) to the VPS IP.
3. **SSH in and install Docker**:

```bash
ssh root@YOUR_SERVER_IP
curl -fsSL https://get.docker.com | sh
```

4. **Upload the project** (from your PC, in the project folder):

```bash
scp -r . root@YOUR_SERVER_IP:/opt/mulewatch
```

Or push the folder to a private GitHub repo and `git clone` it on the server.

5. **Create the production .env** on the server at `/opt/mulewatch/.env`:

```
DATABASE_URL="file:../data/mulewatch.db"
ADMIN_USER="owner"
ADMIN_PASSWORD="a-long-random-password"
SESSION_SECRET="another-long-random-string"
NEXT_PUBLIC_SITE_URL="https://mulecheck.tech"
```

6. **Start it**:

```bash
cd /opt/mulewatch && docker compose up -d --build
```

The app listens only on localhost:3018 inside the server; Caddy in step 7 exposes it publicly. The database and uploaded screenshots live in `/opt/mulewatch/data` and survive restarts and rebuilds.

7. **Add HTTPS with Caddy** (automatic Let's Encrypt certificate):

```bash
apt install -y caddy
cat > /etc/caddy/Caddyfile <<'EOF'
mulecheck.tech, www.mulecheck.tech {
    reverse_proxy 127.0.0.1:3018
    encode gzip
}
EOF
systemctl restart caddy
```

Open `https://mulecheck.tech`. Done.

8. **Load your dataset** (one time):

```bash
docker compose exec mulewatch npm run import -- data/your-list.csv
```

9. **Updates later**: copy the new code up, then `docker compose up -d --build`.

10. **Backups**: nightly copy of `/opt/mulewatch/data` to another place. Example cron line:

```bash
0 3 * * * tar czf /root/backup-$(date +\%F).tgz -C /opt/mulewatch data
```

## Path B: Railway or Render (no server management)

Both can run the Dockerfile and attach a persistent volume.

- **Railway**: New project, Deploy from GitHub repo, add a Volume mounted at `/app/data`, set the four env vars above (use `DATABASE_URL=file:../data/mulewatch.db`), generate a domain or attach yours. Roughly 5 USD per month.
- **Render**: New Web Service from repo, Runtime Docker, add a Disk mounted at `/app/data`, same env vars. Disks require the Starter plan (7 USD per month).

## What about Vercel?

Vercel is serverless with no persistent disk, so SQLite and local screenshot storage will not work there. You would need Postgres (Neon) plus Vercel Blob or S3 for uploads, and the upload code in `src/lib/uploads.ts` would have to be changed to write to that bucket. Path A is simpler and cheaper for this app.

## Before announcing it

- Change `ADMIN_PASSWORD` and `SESSION_SECRET`. Never reuse the dev values.
- Delete the sample rows: log in to `/admin`, All accounts, delete anything tagged with the sample data, or clear the database before importing your list.
- Keep `MASKED` as the default visibility. Approve only with evidence.
- Put your contact email in the footer for takedown and dispute requests.
- Set up the nightly backup. The evidence vault is what police will ask for.

## Security after hosting

What the code already does:

- **Admin**: separate user accounts with user ID and bcrypt-hashed password (Owner and Moderator roles, first-login password change, disable or reset from Admin > Users), minimum 12 characters, 5 failed attempts per IP locks login for 15 minutes, sessions expire after 12 hours, cookie is HttpOnly + Secure + SameSite=strict, every moderator action is written to an append-only audit log (Admin, Audit log tab).
- **Uploads**: only PNG, JPG, WEBP, GIF, PDF; file bytes are sniffed so a renamed APK or EXE is rejected; 8 MB per file; stored outside the web root under `data/uploads`; evidence is served only to a logged-in moderator; community images only while the post is visible.
- **Community**: links, app files, phone numbers, emails, UPI IDs, account, PAN and IFSC numbers are blocked in posts, replies and chat. Honeypot fields and per-IP rate limits on every form. Users can flag any post, reply, comment or chat message to admin.
- **Headers**: Content-Security-Policy (no third-party scripts), X-Frame-Options DENY, nosniff, HSTS in production, Referrer-Policy, Permissions-Policy. `/admin`, `/advice/` links and `/api` are excluded from search engines.
- **Privacy**: reporter contacts and screenshots are never rendered on public pages. IPs are stored only as salted hashes.

What you must do on the server:

```bash
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

```bash
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl restart ssh
```

```bash
apt install -y fail2ban unattended-upgrades && systemctl enable --now fail2ban
```

- Keep port 3018 closed to the internet. Caddy on 443 is the only entry. With ufw above it already is.
- Put `ADMIN_PASSWORD` and `SESSION_SECRET` only in the server `.env`, never in git. Rotate them if a moderator leaves.
- Log in to `/admin` only over HTTPS and only from devices you control. Log out when done.
- Nightly backup of `data/` to a second location (cron line above). Test restoring once.
- Check the Audit log and User reports tabs daily. Hide first, investigate second.
- Add a contact email in the footer for takedown and dispute requests, and act on disputes within 48 hours. Keep MASKED as the default for UPI and bank numbers.
- Once a month run `npm update`, rebuild with `docker compose up -d --build`, to pick up security fixes.

## Updating the live site

On your PC (PowerShell):

```bash
cd C:/Users/Welcome/Downloads && tar --exclude=node_modules --exclude=.next --exclude=data --exclude=.env --exclude=prisma/dev.db -czf mulewatch.tgz mule-exposure && scp mulewatch.tgz root@195.35.7.193:/opt/
```

On the server:

```bash
cd /opt && tar xzf mulewatch.tgz && cp -r mule-exposure/. mulewatch/ && rm -rf mule-exposure && cd /opt/mulewatch && docker compose up -d --build
```

The `.env`, database and uploads live outside the archive, so they are never overwritten.
