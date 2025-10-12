#!/bin/bash
# Quick script to check which files need French/German updates

echo "Files modified in English that need FR/DE updates:"
echo ""
echo "1. admin.json - discountTerminations.queue.empty, discountTerminations.allActive.empty"
echo "2. content.json - statePoliciesPage.sections (compliance, updates, downloads)"  
echo "3. common.json - contentUploadModal.title.add.* keys"
echo ""
echo "Already updated:"
echo "✅ messages.json (all languages)"
echo "✅ recruitment.json (all languages)"
echo "✅ parentLeadForm.json (all languages)"
