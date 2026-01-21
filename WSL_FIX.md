# Fixing WSL Memory Allocation Error

## Problem

Getting error: "Cannot read directory: cannot allocate memory" when running `npm run dev` in WSL.

## Quick Fixes

### 1. Increase WSL Memory Limit (Recommended)

Create or edit `C:\Users\<YourUsername>\.wslconfig` in Windows (not in WSL):

```ini
[wsl2]
memory=4GB
processors=2
swap=2GB
localhostForwarding=true
```

**After creating/editing this file:**
1. Close all WSL terminals
2. Open PowerShell as Administrator
3. Run: `wsl --shutdown`
4. Restart WSL

### 2. Free Up WSL Memory

**Check memory usage:**
```bash
free -h
```

**Clear npm cache:**
```bash
npm cache clean --force
```

**Remove node_modules and reinstall (if needed):**
```bash
rm -rf node_modules package-lock.json
npm install
```

### 3. Use Windows Path Instead

If memory issues persist, try running the project directly from Windows instead of WSL:

1. Open PowerShell or Command Prompt (not WSL)
2. Navigate to the project: `cd "C:\Users\wambu\Downloads\Frontend Projects\lead-intake-hub-main"`
3. Run: `npm run dev`

### 4. Check Available Memory

**In WSL:**
```bash
# Check total memory
free -h

# Check disk space
df -h

# Check what's using memory
ps aux --sort=-%mem | head -10
```

### 5. Increase Swap Space (Temporary Fix)

If you can't increase WSL memory, create a swap file:

```bash
# Check current swap
free -h

# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent (add to /etc/fstab)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 6. Alternative: Use Node Version Manager

Sometimes switching Node versions helps:

```bash
# Install nvm-wsl if not already installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Use a specific Node version
nvm install 18
nvm use 18
```

## Verify Fix

After making changes:

1. **Restart WSL:**
   ```powershell
   # In PowerShell (Windows)
   wsl --shutdown
   ```

2. **Start fresh terminal in WSL**

3. **Check memory:**
   ```bash
   free -h
   ```

4. **Try running dev server:**
   ```bash
   npm run dev
   ```

## If Still Having Issues

1. **Check WSL version:**
   ```powershell
   wsl --list --verbose
   ```
   Should be WSL 2 for better memory management

2. **Move project to WSL filesystem:**
   - Copy project from `/mnt/c/...` to `~/projects/lead-intake-hub`
   - Run from there (better performance)

3. **Check Windows Memory:**
   - Close unnecessary applications
   - Restart Windows if needed

## Best Practices

- **Run projects in WSL filesystem** (`~/projects/`) not Windows filesystem (`/mnt/c/`)
- **Increase WSL memory** to at least 4GB for development
- **Use WSL 2** for better performance and memory management
