@echo off
REM Script para subir Trading-Dome a GitHub y Render

cd "c:\Users\Euson\Documents\APPS PROPIAS\Trading-Dome-main"

echo.
echo ====================================
echo  Trading Dome - Deploy a GitHub
echo ====================================
echo.

REM Verificar estado
echo [1/5] Verificando estado del repo...
git status
echo.

REM Agregar todos los cambios
echo [2/5] Agregando archivos...
git add .
echo ✅ Archivos agregados
echo.

REM Hacer commit
echo [3/5] Haciendo commit...
git commit -m "feat: Preparar proyecto para Render - agregar package.json, .gitignore y puerto dinamico"
echo ✅ Commit realizado
echo.

REM Conectar con repositorio remoto
echo [4/5] Conectando con GitHub...
git remote add origin https://github.com/MikeSobrado/Trading-Dome.git
echo ✅ Remote configurado (ignorar error si ya existe)
echo.

REM Hacer push
echo [5/5] Subiendo a GitHub...
git branch -M main
git push -u origin main
echo.
echo ✅ ¡Código subido a GitHub!
echo.
echo Próximo paso: Ir a https://render.com y crear Web Service
echo.
pause
