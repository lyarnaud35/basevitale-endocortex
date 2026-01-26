#!/bin/bash

# Script pour remplacer tous les '@Roles('ADMIN' par @Roles(Role.ADMIN
# et ajouter l'import Role si nécessaire

echo "🔧 Correction des rôles dans les contrôleurs..."

find apps/api/src -name "*.controller.ts" -type f | while read file; do
  # Vérifier si le fichier utilise des rôles en string
  if grep -q "@Roles('ADMIN'\|'DOCTOR'\|'NURSE'\|'SECRETARY'\|'READONLY')" "$file" 2>/dev/null; then
    echo "  📝 Correction de $file"
    
    # Remplacer les strings par Role.XXX
    sed -i '' "s/@Roles('ADMIN'/@Roles(Role.ADMIN/g" "$file"
    sed -i '' "s/@Roles('DOCTOR'/@Roles(Role.DOCTOR/g" "$file"
    sed -i '' "s/@Roles('NURSE'/@Roles(Role.NURSE/g" "$file"
    sed -i '' "s/@Roles('SECRETARY'/@Roles(Role.SECRETARY/g" "$file"
    sed -i '' "s/@Roles('READONLY'/@Roles(Role.READONLY/g" "$file"
    
    # Remplacer les occurrences dans les paramètres multiples
    sed -i '' "s/'ADMIN'/, Role.ADMIN/g" "$file"
    sed -i '' "s/'DOCTOR'/, Role.DOCTOR/g" "$file"
    sed -i '' "s/'NURSE'/, Role.NURSE/g" "$file"
    sed -i '' "s/'SECRETARY'/, Role.SECRETARY/g" "$file"
    sed -i '' "s/'READONLY'/, Role.READONLY/g" "$file"
    
    # Ajouter l'import Role si nécessaire
    if ! grep -q "import.*Role.*from.*role.guard" "$file" 2>/dev/null; then
      # Trouver la ligne avec l'import Roles
      if grep -q "from '../common/decorators/roles.decorator'" "$file"; then
        sed -i '' "/from '..\/common\/decorators\/roles.decorator'/a\\
import { Role } from '../common/guards/role.guard';
" "$file"
      fi
    fi
  fi
done

echo "✅ Correction terminée !"
