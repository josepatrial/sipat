@echo off
title Publicando no GitHub - Sorteio SIPAT
echo Enviando arquivos para o GitHub...
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ==============================================
    echo SUCESSO! O projeto foi publicado no GitHub!
    echo ==============================================
) else (
    echo ==============================================
    echo ATENCAO: Certifique-se de que o repositorio
    echo 'sorteio-sipat' foi criado no seu GitHub:
    echo https://github.com/new
    echo ==============================================
)
echo.
pause
