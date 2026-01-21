# n8n Webhook Setup Guide

This guide helps you configure n8n webhooks to work with the Lead Intake Hub application.

## Common Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

This error occurs when the webhook returns HTML instead of JSON. Common causes:

1. **Incorrect Webhook URL** - The URL doesn't match your n8n webhook
2. **CORS Issues** - Browser blocking the request
3. **Webhook Not Active** - The n8n workflow is not active
4. **Wrong HTTP Method** - Using GET instead of POST or vice versa

## Webhook Configuration

### 1. Admin Webhook - List Leads (GET)

**Webhook Path:** `/webhook/list-leads`  
**HTTP Method:** GET  
**Response Format:**
```json
{
  "success": true,
  "totalLeads": 0,
  "leads": [],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**n8n Workflow Setup:**
1. Create a Webhook node
2. Set path to: `list-leads`
3. Set HTTP Method to: `GET`
4. Set Response Mode to: `Last Node`
5. Connect to your Google Sheets "Read" node
6. Format the response with a Code node
7. Use "Respond to Webhook" node to return JSON

**Expected Response Structure:**
- The `leads` array should contain objects with:
  - `name` (string)
  - `email` (string)
  - `phone` (string)
  - `company` (string)
  - `submittedAt` (ISO date string)
  - `status` (string: 'pending' | 'processing' | 'completed' | 'failed')

### 2. Submit Webhook - Create Lead (POST)

**Webhook Path:** `/webhook/lead-submit`  
**HTTP Method:** POST  
**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "+1 (555) 123-4567",
  "company": "Acme Corp",
  "submittedAt": "2024-01-01T00:00:00.000Z",
  "status": "pending"
}
```

## CORS Configuration

n8n needs to allow CORS requests from your frontend domain. Here's how to configure it:

### Option 1: n8n Environment Variables

Add these to your n8n `.env` file or environment variables:

```env
N8N_CORS_ORIGIN=https://your-frontend-domain.com
# Or for multiple origins:
N8N_CORS_ORIGIN=https://your-frontend-domain.com,http://localhost:8080
```

### Option 2: n8n Configuration File

In your n8n configuration, set:

```json
{
  "cors": {
    "origin": ["https://your-frontend-domain.com", "http://localhost:8080"],
    "credentials": false
  }
}
```

### Option 3: n8n Cloud

If using n8n Cloud:
1. Go to Settings → Security
2. Add your frontend domain to CORS allowed origins
3. Save changes

## Testing the Webhook

### Test GET Webhook (List Leads)

```bash
curl -X GET "https://your-n8n-instance.com/webhook/list-leads" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "totalLeads": 0,
  "leads": [],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test POST Webhook (Submit Lead)

```bash
curl -X POST "https://your-n8n-instance.com/webhook/lead-submit" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+1 (555) 123-4567",
    "company": "Test Corp",
    "submittedAt": "2024-01-01T00:00:00.000Z",
    "status": "pending"
  }'
```

## Troubleshooting

### Error: "Failed to fetch" or Network Error

**Possible Causes:**
- Webhook URL is incorrect
- n8n server is not accessible
- CORS is blocking the request

**Solutions:**
1. Verify the webhook URL in Settings matches your n8n instance
2. Test the webhook URL directly in browser (should return JSON)
3. Check n8n CORS configuration
4. Check browser console for CORS errors

### Error: "Unexpected token '<', "<!DOCTYPE "..."

**Possible Causes:**
- Webhook returning HTML error page (404, 500, etc.)
- Wrong webhook path
- Webhook not active

**Solutions:**
1. Verify the webhook path in n8n matches what's in Settings
2. Ensure the n8n workflow is **active** (not just saved)
3. Check n8n execution logs for errors
4. Test the webhook URL directly - it should return JSON, not HTML

### Error: "Webhook returned 404"

**Solutions:**
1. Check the webhook path is correct
2. Ensure the webhook node is properly configured
3. Verify the workflow is active
4. Check n8n webhook list to see available webhooks

### Error: "Webhook returned 500"

**Solutions:**
1. Check n8n execution logs for the error
2. Verify Google Sheets credentials are valid
3. Check that the Google Sheet ID is correct
4. Ensure the sheet has the correct columns

## Webhook URL Format

The webhook URL should be in this format:

```
https://your-n8n-instance.com/webhook/list-leads
https://your-n8n-instance.com/webhook/lead-submit
```

**Important:**
- Must use HTTPS (or HTTP for localhost only)
- Path should match exactly what's configured in n8n
- No trailing slash

## Security Headers

The application sends these headers with requests:

- `Content-Type: application/json`
- `X-Requested-With: XMLHttpRequest`

Your n8n webhook can validate the `X-Requested-With` header for additional security:

```javascript
// In n8n Code node
if ($input.headers['x-requested-with'] !== 'XMLHttpRequest') {
  throw new Error('Invalid request');
}
```

## Verification Checklist

- [ ] Webhook URL is correct in Settings
- [ ] n8n workflow is **active** (not just saved)
- [ ] Webhook path matches exactly (`/webhook/list-leads` or `/webhook/lead-submit`)
- [ ] CORS is configured in n8n
- [ ] Webhook returns JSON (test in browser)
- [ ] Google Sheets credentials are valid
- [ ] Response format matches expected structure

## Getting the Webhook URL

1. In n8n, open your workflow
2. Click on the Webhook node
3. Copy the "Production URL" or "Test URL"
4. Paste it into the Settings page in the application

**Example:**
- n8n shows: `https://n8n.example.com/webhook/list-leads`
- Use in Settings: `https://n8n.example.com/webhook/list-leads`

## Need Help?

If you're still experiencing issues:

1. Check the browser's Network tab to see the actual request/response
2. Check n8n execution logs for errors
3. Verify the webhook URL works when accessed directly
4. Ensure all n8n credentials are valid and not expired

