# Lead Intake Hub

A modern lead management system with a React frontend and n8n automation workflow backend for capturing, validating, and processing sales leads.

**Live Demo:** [Lead Management](lead-management-dash.vercel.app/)

---

## 🎯 Overview

Lead Intake Hub is a full-stack lead management solution that combines a lightweight React web application with powerful n8n workflow automation. The system captures leads through a public form, validates submissions, and automatically processes them across multiple platforms including Google Sheets, ClickUp, and Airtable.

### Key Features

- 📝 **Public Lead Submission Form** – Clean, responsive form for capturing lead information  
- 🔍 **Real-time Validation** – Frontend and backend validation for data quality  
- 🔄 **Automated Processing** – n8n workflow handles validation, storage, and task creation  
- 📅 **Scheduled Batch Processing** – Daily automation catches any unprocessed leads  
- 🔗 **Multi-Platform Integration** – Syncs with Google Sheets, ClickUp, and Airtable  

---

## 🏗️ Architecture

### Frontend (This Repository)

- **Tech Stack:** React + TypeScript + Vite + Tailwind CSS  
- **Role:** Provides UI for lead submission and admin management  
- **Deployment:** Static site (Netlify, Vercel, etc.)  

### Backend (n8n Workflow)

- **Platform:** n8n workflow automation  
- **Role:** Validates leads, manages data flow, integrates with external services  
- **Endpoints:**  
  - `POST /webhook/submit-lead` – Accept new lead submissions  
  - `GET /webhook/list-leads` – Retrieve all leads for admin dashboard  

---

## 📋 How It Works

### Lead Submission Flow

1. User submits form with name, email, phone, and company  
2. Frontend validates basic required fields  
3. n8n webhook receives submission at `/webhook/submit-lead`  
4. n8n validates data:  
   - Required fields present  
   - Email format (regex validation)  
   - Phone number (minimum 10 digits)  
5. On validation failure:  
   - n8n returns `{ success: false, errors: [...] }`  
6. On success:  
   - Generates unique leadId (e.g., `LEAD-1234567890-abc123`)  
   - Adds metadata (`submittedAt`, `source: 'website'`, `status: 'New'`)  
   - Appends lead to Google Sheets  
   - Creates ClickUp task with lead details  
   - Syncs to Airtable CRM  
   - Returns success response with lead ID and task details  

### Admin Dashboard Flow

1. Admin opens dashboard in the app  
2. Frontend calls `GET /webhook/list-leads`  
3. n8n reads Google Sheets database  
4. n8n formats leads (sorted by most recent first)  
5. Frontend displays leads with processing status  

### Scheduled Batch Processing

- **Trigger:** Daily at 7 AM (configurable in n8n)  
- **Purpose:** Catch any leads that weren't processed in real-time  
- **Process:**  
  1. Read all leads from Google Sheets  
  2. Filter for unprocessed leads (`Processed = 'No'`)  
  3. Limit to 20 leads per batch (rate limiting)  
  4. Create ClickUp tasks in batch  
  5. Update Airtable records  
  6. Mark as processed in Google Sheets  

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ and npm  
- Active n8n instance (self-hosted or n8n Cloud)  
- Google Sheets account  
- ClickUp account  
- Airtable account (optional)  

### 1. Clone the Repository

```bash
git clone https://github.com/WambuaJoe/Lead-Management-Dashboard.git

cd Lead-Management-Dashboard
```

### 2. Install Dependencies
```
npm install
```

### 3. Configure n8n Workflow
- Open your n8n instance
- Create a new workflow
- Import the workflow JSON (see workflow structure in documentation)
- Configure credentials for:
    - Google Sheets OAuth2
    - ClickUp OAuth2
    - Airtable Personal Access Token
    - Set Up Google Sheets
    - Create a Google Sheet with these columns:
        - Column	Description
        - LeadId	Unique identifier (auto-generated)
        - Name: Contact name
        - Email: Contact email
        - Phone: Contact phone
        - Company: Company name
        - SubmittedAt: Submission timestamp
        - Source: Lead source (e.g., "website")
        - Status: Processing status
        - Processed: "Yes" or "No"
        - ProcessedDate: When processing completed
        - ClickUpTaskId: Associated ClickUp task ID
- Configure ClickUp:
    - Create workspace, folder, and list in ClickUp
    - Update the n8n workflow nodes with your ClickUp IDs
    - Optionally add a custom field for "Lead ID"
- Configure Airtable (Optional)
    - Create a base with a "Leads" table
    - Add fields: Name, Email, Phone, Company, Status, Submitted Date, ClickUpTaskId, ClickUpTaskUrl
    - Generate a Personal Access Token
- Update n8n workflow with your base and table IDs
- Activate Webhooks
- Activate the n8n workflow
- Note your webhook URLs (e.g., https://your-n8n-instance.com/webhook/submit-lead)

### 4. Configure Frontend
### Option A: Update Config File (Development)
- Edit src/lib/config.ts:
```
export const defaultWebhooks = {
  submitWebhookUrl: 'https://your-n8n-instance.com/webhook/submit-lead',
  readWebhookUrl: 'https://your-n8n-instance.com/webhook/list-leads'
};
```

### Option B: Use Settings UI (Production)
Start dev server: ``` npm run dev ```

### 5. Enable CORS (Important!)
`n8n Cloud`: Configure allowed origins in settings

`Self-hosted`: Add CORS headers in your reverse proxy or n8n environment variables

### 6. Run the Application
#### Development
```
npm run dev
```

#### Build for production
```
npm run build
```

#### Preview production build
```
npm run preview
🧪 Testing the Integration
```
- Test Lead Submission
- Open the public form at / and submit a test lead:
```
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "0123456789",
  "company": "Example Co"
}
```
- Check for success response with leadId and clickUpTaskId
- Verify in:
    - Google Sheets (new row added)
    - ClickUp (new task created)
    - Airtable (new record created)

### Test Admin Dashboard
- Navigate to /admin
- Enter admin password (if configured)
- Verify leads display correctly, sorted by recent
- Test Validation
- Submit invalid data to test error handling:
```
// Missing required fields
{ "name": "John" }
Response:

{ "success": false, "errors": ["Email is required", ...] }
// Invalid email format
{ "name": "John", "email": "invalid", "phone": "123", "company": "Test" }
Response:

{ "success": false, "errors": ["Invalid email format", ...] }
// Invalid phone (too short)
{ "name": "John", "email": "john@test.com", "phone": "123", "company": "Test" }
Response:

{ "success": false, "errors": ["Phone must contain at least 10 digits"] }
```
📁 Project Structure
```
Lead-Management-Dashboard/
├── public/                     # Static assets
├── src/
│   ├── components/            # Reusable UI components
│   ├── pages/
│   │   ├── LeadForm.tsx      # Public lead submission form
│   │   ├── Admin.tsx         # Admin dashboard
│   │   └── Settings.tsx      # Configuration page
│   ├── lib/
│   │   └── config.ts         # Webhook URLs and storage utilities
│   ├── styles/               # Tailwind CSS
│   └── main.tsx              # App entry point
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## 🔧 Configuration Reference
Environment Variables (Optional)
- For production deployments, use:
```
VITE_SUBMIT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/submit-lead

VITE_READ_WEBHOOK_URL=https://your-n8n-instance.com/webhook/list-leads
```
- Webhook URLs: Encrypted
- Scope: Settings are per-browser, not synced across devices

## 🐛 Troubleshooting
### 1. Frontend can't find list-leads webhook URL
```
"Read Webhook Not Configured" Error
```
Solutions:
- Open Settings page and enter correct n8n read webhook URL
- Or update src/lib/config.ts with correct URL

### 2. CORS issue or incorrect webhook URL
```
Admin Dashboard Shows HTML Instead of JSON
```
Solutions:
- Enable CORS on your n8n instance for your frontend domain
- Verify webhook URL is correct and active
- Check n8n workflow is activated
- Check browser console Network tab for errors


### 3. n8n workflow credentials or configuration issue
```
Leads Not Processing
```
Solutions:
- Verify credentials (Google Sheets, ClickUp, Airtable)
- Check Google Sheet columns
- Verify ClickUp workspace/space/folder/list IDs
- Check n8n workflow logs

### 4. Validation errors or webhook unreachable
```
Form Submission Fails
```
Solutions:
- Check browser console for errors
- Verify required fields are filled
- Test webhook with curl/Postman
- Ensure n8n workflow is active

## 🔒 Security Notes
- Webhook URLs can be encrypted in localStorage
- Never commit webhook URLs to version control
- Use environment variables for production deployments
- Consider rate limiting on n8n webhooks
- Regularly rotate API tokens (Google Sheets, ClickUp, Airtable)

## 📊 API Reference
### POST /webhook/submit-lead
- Request Body:
```
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "0123456789",
  "company": "Example Co"
}
```
- Success Response (200):
```
{
  "success": true,
  "leadId": "LEAD-1737460800000-abc123",
  "submittedAt": "2026-01-21T10:00:00.000Z",
  "status": "processed",
  "clickUpTaskId": "task_123",
  "clickUpTaskUrl": "https://app.clickup.com/t/task_123"
}
```
- Validation Error Response (200):
```
{
  "success": false,
  "errors": [
    "Email is required",
    "Phone must contain at least 10 digits"
  ]
}
```
### GET /webhook/list-leads
- Response:
```
{
  "success": true,
  "totalLeads": 42,
  "timestamp": "2026-01-21T10:00:00.000Z",
  "leads": [
    {
      "LeadId": "LEAD-1737460800000-abc123",
      "Name": "Jane Doe",
      "Email": "jane@example.com",
      "Phone": "0123456789",
      "Company": "Example Co",
      "SubmittedAt": "21-01-2026 10:00:00",
      "Source": "website",
      "Status": "Processed",
      "Processed": "Yes",
      "ProcessedDate": "21-01-2026 10:01:00",
      "ClickUpTaskId": "task_123"
    }
  ]
}
```

## 🤝 Contributing
Contributions are welcome! Please follow these guidelines:
- Fork the repository
- Create a feature branch (git checkout -b feature/amazing-feature)
- Commit your changes (git commit -m 'Add amazing feature')
- Push to the branch (git push origin feature/amazing-feature)
- Open a Pull Request

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments
- Built with Vite
- Powered by n8n workflow automation
- UI styled with Tailwind CSS
- Integrations: Google Sheets, ClickUp, Airtable

## 📞 Support
For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the n8n workflow execution logs

