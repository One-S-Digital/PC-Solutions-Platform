#!/bin/bash

# Script to find all translation calls missing namespace prefixes

echo "=== Finding all translation calls without proper namespace prefixes ==="
echo ""

echo "1. Files using 'buttons.' without common: namespace"
rg "t\(['\"]buttons\." frontend/ -l | sort | uniq

echo ""
echo "2. Files using 'errors.' without common: namespace"
rg "t\(['\"]errors\." frontend/ -l | sort | uniq

echo ""
echo "3. Files using 'forms.' without common: namespace"
rg "t\(['\"]forms\." frontend/ -l | sort | uniq

echo ""
echo "4. Files using 'loginPage.' without common: namespace"
rg "t\(['\"]loginPage\." frontend/ -l | sort | uniq

echo ""
echo "5. Files using 'dashboardPage.' without common: namespace"  
rg "t\(['\"]dashboardPage\." frontend/ -l | sort | uniq

echo ""
echo "6. Files using 'hidePassword' or 'showPassword' without common: namespace"
rg "t\(['\"](?:hide|show)Password['\"]" frontend/ -l | sort | uniq

echo ""
echo "7. Files using 'settingsPage.' without common: namespace"
rg "t\(['\"]settingsPage\." frontend/ -l | sort | uniq

echo ""
echo "=== Complete List of Affected Files ==="
rg "t\(['\"](?:buttons|errors|forms|loginPage|dashboardPage|settingsPage|hidePassword|showPassword)\." frontend/ -l | sort | uniq
