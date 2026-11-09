@echo off
chcp 65001 >nul
title Habilitar Acceso en Red Local - Portal de Certificados Tributarios
color 0A

echo ==============================================================================
echo   CENTRO COMERCIAL PRIMAVERA URBANA - PORTAL DE CERTIFICADOS TRIBUTARIOS
echo   Configuración de Firewall de Windows para Acceso en Red Local
echo ==============================================================================
echo.
echo Verificando privilegios de Administrador...
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Solicitando permisos de Administrador para abrir el Puerto 3000...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo [+] Privilegios de Administrador confirmados.
echo [+] Creando regla en el Firewall de Windows para permitir el Puerto 3000 (TCP)...
echo.

netsh advfirewall firewall delete rule name="Portal Certificados Tributarios (Puerto 3000)" >nul 2>&1

netsh advfirewall firewall add rule name="Portal Certificados Tributarios (Puerto 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any

echo.
if %errorlevel% equ 0 (
    echo ==============================================================================
    echo  ¡CONFIGURACIÓN EXITOSA!
    echo ==============================================================================
    echo  El puerto 3000 quedó habilitado para todos los perfiles de red.
    echo.
    echo  Cualquier equipo de la red local ya puede ingresar al portal desde:
    echo.
    echo    👉 http://172.20.20.110:3000
    echo.
    echo  Y al Módulo Contable Privado desde:
    echo.
    echo    👉 http://172.20.20.110:3000#admin
    echo ==============================================================================
) else (
    echo [X] Ocurrió un error al intentar agregar la regla al Firewall.
    echo     Por favor comuníquese con el departamento de Sistemas/TI.
)

echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
