# Customer File Onboarding Procedure
When a customer sends a file (PDF, Image, CSV):
1. Use the 'read' tool if it's a text-based file.
2. If it's a large dataset, use the 'supabase-provision' skill to upload to BJS storage.
3. Save the file metadata (URL, purpose) to the customer's specific log in `memory/customers/`.
4. Acknowledge receipt and explain how the data is now part of your working context.
