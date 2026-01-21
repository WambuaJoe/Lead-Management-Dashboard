# Fixing CORS Error: HTML Response Instead of JSON

## Problem

You're getting this error: **"Invalid response format. Expected JSON but received text/html"**

This happens when your webhook returns HTML (an error page) instead of JSON. This is almost always a **CORS (Cross-Origin Resource Sharing)** issue.

## Quick Fix: Configure CORS in n8n

### Option 1: n8n Environment Variables (Recommended)

Add this to your n8n `.env` file or environment variables:

```env
# For production
N8N_CORS_ORIGIN=https://your-frontend-domain.com

# For development (multiple origins)
N8N_CORS_ORIGIN=http://localhost:8080,http://localhost:5173,https://your-frontend-domain.com
```

**After setting this, restart n8n.**

### Option 2: n8n Cloud Settings

If using n8n Cloud:

1. Go to your n8n Cloud dashboard
2. Navigate to **Settings** → **Security**
3. Under **CORS**, add your frontend domain(s)
4. Save changes

### Option 3: n8n Self-Hosted Configuration

If self-hosting n8n, edit your `~/.n8n/config` file:

```json
{
  "cors": {
    "origin": [
      "http://localhost:8080",
      "http://localhost:5173",
      "https://your-production-domain.com"
    ],
    "credentials": false
  }
}
```

Then restart n8n.

## Verify CORS is Working

### Test 1: Direct Browser Test

1. Open your browser's Developer Tools (F12)
2. Go to the **Network** tab
3. Try the "Refresh" button in the Admin page
4. Look for the webhook request
5. Check the **Response Headers** - you should see:
   ```
   Access-Control-Allow-Origin: http://localhost:8080
   Access-Control-Allow-Methods: GET, POST, OPTIONS
   Access-Control-Allow-Headers: Content-Type, X-Requested-With
   ```

### Test 2: CORS Preflight Check

The browser sends a preflight OPTIONS request first. Check if you see:
- A request with method `OPTIONS` to your webhook
- Status `204` or `200`
- CORS headers in the response

If the OPTIONS request fails or returns HTML, CORS is not configured.

## Common Issues

### Issue 1: "CORS policy blocked"

**Symptom:** Browser console shows CORS error  
**Solution:** Add your domain to n8n CORS origins

### Issue 2: Webhook works in Postman/curl but not browser

**Symptom:** Direct HTTP requests work, browser requests fail  
**Cause:** CORS is only enforced by browsers  
**Solution:** Configure CORS in n8n (see above)

### Issue 3: Works locally but not in production

**Symptom:** `localhost` works, production domain fails  
**Cause:** Production domain not in CORS allowed origins  
**Solution:** Add production domain to CORS configuration

### Issue 4: Still getting HTML after CORS fix

**Possible causes:**
1. n8n not restarted after CORS config change
2. Wrong domain format (must include protocol: `https://` not just `domain.com`)
3. Typo in domain name
4. Using n8n Cloud but CORS not saved properly

## Wildcard CORS (NOT Recommended for Production)

If you need to allow all origins (development only):

```env
N8N_CORS_ORIGIN=*
```

**⚠️ Warning:** Never use `*` in production - it's a security risk!

## Testing Your Webhook Directly

### Test GET Webhook (List Leads)

```bash
curl -X GET "https://your-n8n-instance.com/webhook/list-leads" \
  -H "Accept: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -v
```

Look for CORS headers in the response:
```
< Access-Control-Allow-Origin: http://localhost:8080
< Access-Control-Allow-Methods: GET, POST, OPTIONS
```

### Test with Browser DevTools

1. Open browser console
2. Run:
   ```javascript
   fetch('https://your-n8n-instance.com/webhook/list-leads', {
     method: 'GET',
     headers: {
       'Accept': 'application/json',
       'X-Requested-With': 'XMLHttpRequest'
     },
     mode: 'cors'
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error)
   ```

If you see CORS errors in the console, CORS is not configured correctly.

## After Fixing CORS

1. **Restart n8n** (if using environment variables)
2. **Clear browser cache** (Ctrl+Shift+R)
3. **Try the Refresh button again**
4. Check browser Network tab to verify CORS headers are present

## Still Having Issues?

1. Check n8n logs for CORS-related errors
2. Verify the webhook URL is correct
3. Ensure the n8n workflow is **active** (green play button)
4. Test the webhook URL directly in browser - should return JSON, not HTML
5. Check browser console for specific CORS error messages

## Quick Reference

**Your webhook should return:**
- ✅ JSON response with `Content-Type: application/json`
- ✅ CORS headers in response

**Your webhook should NOT return:**
- ❌ HTML error pages
- ❌ Missing CORS headers
- ❌ 403/401 errors without CORS headers

---

**Remember:** CORS is a browser security feature. If your webhook works in Postman/curl but not in the browser, it's definitely a CORS configuration issue in n8n.
