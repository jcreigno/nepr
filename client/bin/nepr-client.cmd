@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe" "%~dp0\..\nepr-client\bin\nepr-client.js" %*
) ELSE (
  node "%~dp0\..\nepr-client\bin\nepr-client.js" %*
)
