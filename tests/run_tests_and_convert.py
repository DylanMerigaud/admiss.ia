#!/usr/bin/env python3
"""
Run lesson generation tests and automatically convert outputs to markdown
Convenience script for complete test-to-documentation workflow
"""

import asyncio
import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle the output"""
    print(f"\n🔄 {description}")
    print("=" * 50)
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(result.stdout)
            print(f"✅ {description} completed successfully!")
            return True
        else:
            print(f"❌ {description} failed!")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Error running {description}: {e}")
        return False

def main():
    """Main function to run tests and convert outputs"""
    
    print("🧪 Complete Test and Documentation Generation Workflow")
    print("=" * 60)
    
    # Ensure we're in the right directory
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    print(f"📁 Working directory: {os.getcwd()}")
    
    # Step 1: Run the lesson generation tests
    success1 = run_command(
        "python tests/test_cardiology.py",
        "Running lesson generation tests"
    )
    
    if not success1:
        print("\n⚠️ Tests failed, but continuing with conversion of any existing outputs...")
    
    # Step 2: Convert JSON outputs to markdown
    success2 = run_command(
        "python tests/convert_to_markdown.py", 
        "Converting JSON outputs to markdown"
    )
    
    # Summary
    print("\n📊 Workflow Summary")
    print("=" * 30)
    print(f"   - Test Generation: {'✅ SUCCESS' if success1 else '❌ FAILED'}")
    print(f"   - Markdown Conversion: {'✅ SUCCESS' if success2 else '❌ FAILED'}")
    
    if success2:
        print(f"\n📖 View Results:")
        print(f"   - Generated lessons index: tests/markdown_outputs/README.md")
        print(f"   - Individual lessons: tests/markdown_outputs/*.md")
        print(f"   - Raw JSON outputs: tests/*lesson_output_*.json")
    
    if success1 and success2:
        print(f"\n🎉 Complete workflow successful!")
        print(f"💡 Your lessons are now available in human-readable markdown format")
    else:
        print(f"\n⚠️ Some steps failed - check the output above for details")
    
    return success1 and success2

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 