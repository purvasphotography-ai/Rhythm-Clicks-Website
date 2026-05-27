#!/bin/bash
# Move to the folder where this script is located
cd "$(dirname "$0")"
echo "--------------------------------------------------"
echo "Syncing Rhythm Clicks Studio Gallery Images..."
echo "--------------------------------------------------"
python3 update_gallery.py
echo "--------------------------------------------------"
echo "Done! The website gallery has been updated."
echo "You can refresh your browser now."
echo "--------------------------------------------------"
# Wait for user input so the window doesn't close immediately
read -p "Press Enter to close this window..."
Done
