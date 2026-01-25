@echo off
REM Cleanup script to remove old documentation and logs
REM Keep only TODO.md and TODO_STATUS_AUDIT.md

cd /d "E:\FRONT END\Secured-Data-App"

REM Files to delete
del /F /Q "QUICK_FIX_GUIDE.md" 2>nul
del /F /Q "MONGODB_TIMEOUT_FIX.md" 2>nul
del /F /Q "SESSION_FIX_SUMMARY.md" 2>nul
del /F /Q "JWT_FIX_SUMMARY.md" 2>nul
del /F /Q "JWT_TOKEN_FIX.md" 2>nul
del /F /Q "COMPLETE_SYSTEM_STATUS.md" 2>nul
del /F /Q "TEST_NOW.md" 2>nul
del /F /Q "NEXT_STEPS.md" 2>nul

del /F /Q "AUDIT_DOCUMENTATION_INDEX.md" 2>nul
del /F /Q "AUDIT_FINAL_SUMMARY.md" 2>nul
del /F /Q "CODEBASE_AUDIT_REPORT.md" 2>nul
del /F /Q "CODERABBIT_IMPLEMENTATION_SUMMARY.md" 2>nul
del /F /Q "CODERABBIT_SUGGESTIONS.md" 2>nul
del /F /Q "COMPLETE_DELIVERABLES.md" 2>nul
del /F /Q "COMPLETE_IMPLEMENTATION.md" 2>nul
del /F /Q "COMPLETE_SETUP_GUIDE.md" 2>nul
del /F /Q "COMPLETION_CHECKLIST.md" 2>nul
del /F /Q "COMPLETION_REPORT.md" 2>nul
del /F /Q "DEPLOYMENT_GUIDE.md" 2>nul
del /F /Q "DOCUMENTATION_COMPLETE_INDEX.md" 2>nul
del /F /Q "DOCUMENTATION_INDEX.md" 2>nul
del /F /Q "DOCUMENTATION_INDEX_COMPLETE.md" 2>nul
del /F /Q "ENVIRONMENT_CONFIG.md" 2>nul
del /F /Q "EXECUTIVE_SUMMARY.md" 2>nul
del /F /Q "FILE_INVENTORY.md" 2>nul
del /F /Q "FINAL_DELIVERY_SUMMARY.md" 2>nul
del /F /Q "FINAL_PHASE_3_SUMMARY.md" 2>nul
del /F /Q "FULL_STACK_COMPLETION_REPORT.md" 2>nul
del /F /Q "GO_LIVE_CHECKLIST.md" 2>nul
del /F /Q "HOW_TO_START_SERVERS.md" 2>nul
del /F /Q "IMMEDIATE_NEXT_STEPS_EXECUTED.md" 2>nul
del /F /Q "IMPLEMENTATION_COMPLETE.md" 2>nul
del /F /Q "IMPLEMENTATION_GUIDE.md" 2>nul
del /F /Q "LIVE_SERVER_STATUS.md" 2>nul
del /F /Q "LIVE_SYSTEM_STATUS.md" 2>nul
del /F /Q "PRODUCTION_READY.md" 2>nul
del /F /Q "PROGRESS_LOG_FINAL.md" 2>nul
del /F /Q "QUICK_REFERENCE.md" 2>nul
del /F /Q "QUICK_START.md" 2>nul
del /F /Q "QUICK_TEST.md" 2>nul
del /F /Q "README_FINAL.md" 2>nul
del /F /Q "REMAINING_TASKS_LOG.md" 2>nul
del /F /Q "SERVERS_RUNNING.md" 2>nul
del /F /Q "SERVERS_STARTED_FUNCTIONALITY_TEST.md" 2>nul
del /F /Q "SERVERS_STATUS_AND_TESTING.md" 2>nul
del /F /Q "SERVER_STARTUP_LOG.md" 2>nul
del /F /Q "SYSTEM_STATUS.md" 2>nul
del /F /Q "TASK_LOGS_INDEX.md" 2>nul
del /F /Q "UAT_READINESS_REPORT.md" 2>nul
del /F /Q "UAT_TESTING_GUIDE.md" 2>nul

REM Delete PHASE_ files
for /F %%F in ('dir /B PHASE_*.md 2^>nul') do del /F /Q "%%F"

REM Delete SESSION_ files (except keep the essential ones if needed)
for /F %%F in ('dir /B SESSION_*.md 2^>nul') do del /F /Q "%%F"

REM Delete TASK_LOG_ files
for /F %%F in ('dir /B TASK_LOG_*.md 2^>nul') do del /F /Q "%%F"

echo.
echo Cleanup complete!
echo Kept: TODO.md, TODO_STATUS_AUDIT.md, README.md
echo.
pause
