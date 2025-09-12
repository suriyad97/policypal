#!/usr/bin/env python3
"""
PolicyPal Python Backend Server
Run this script to start the FastAPI server
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(current_dir.parent / '.env')

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting PolicyPal Python Backend Server...")
    print(f"📊 Database: {os.getenv('AZURE_SQL_DATABASE', 'lms-db')}")
    print(f"🌐 Server: http://localhost:5000")
    print(f"📖 API Docs: http://localhost:5000/docs")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )