#!/bin/bash

# Find all controller files that use ClerkAuthGuard
controllers=$(find /workspace/api/src -name "*.controller.ts" -not -path "*/_old/*" | xargs grep -l "ClerkAuthGuard")

for file in $controllers; do
    echo "Updating $file"
    
    # Replace import statements
    sed -i "s|import { ClerkAuthGuard } from '\.\./auth/clerk-auth\.guard';||g" "$file"
    sed -i "s|import { RolesGuard } from '\.\./auth/roles\.guard';|import { RolesGuard } from '../auth/guards/roles.guard';|g" "$file"
    sed -i "s|import { Roles } from '\.\./auth/roles\.decorator';|import { Roles } from '../auth/decorators/roles.decorator';|g" "$file"
    sed -i "s|import { UserRole } from '@repo/types';|import { UserRole } from '@prisma/client';|g" "$file"
    
    # Remove ClerkAuthGuard from UseGuards
    sed -i "s|@UseGuards(ClerkAuthGuard, RolesGuard)|@UseGuards(RolesGuard)|g" "$file"
    sed -i "s|@UseGuards(ClerkAuthGuard)|@UseGuards()|g" "$file"
    
    # Update req.user to req.context
    sed -i "s|req\.user\.id|req.context.userId|g" "$file"
    sed -i "s|req\.user\.role|req.context.role|g" "$file"
    sed -i "s|request\.user\.id|request.context.userId|g" "$file"
    sed -i "s|request\.user\.role|request.context.role|g" "$file"
done

echo "Done updating controllers"