-- Add slack_workspace_id column to organizations table
ALTER TABLE organizations 
ADD COLUMN slack_workspace_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_organizations_slack_workspace_id ON organizations(slack_workspace_id);

-- Add comment
COMMENT ON COLUMN organizations.slack_workspace_id IS 'Slack workspace ID for OAuth integration';