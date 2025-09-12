#!/usr/bin/env python3
import uvicorn
import os
import sys

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("Starting PolicyPal Python Backend Server...")
    print("Server will be available at: http://localhost:5000")
    print("API Documentation: http://localhost:5000/docs")
    print("Health Check: http://localhost:5000/api/health")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )