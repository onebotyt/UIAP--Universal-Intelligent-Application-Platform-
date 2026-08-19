; UIAP Windows Installer Setup Script
; Requires Inno Setup 6+

[Setup]
AppName=UIAP Edge
AppVersion=0.1.0
AppPublisher=UIAP Project
AppPublisherURL=https://uiap.local
DefaultDirName={localappdata}\UIAP
DefaultGroupName=UIAP
OutputDir=..\build
OutputBaseFilename=UIAP-Setup
PrivilegesRequired=admin
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableDirPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; The application code (immutable)
Source: "..\build\UIAP\application\*"; DestDir: "{app}\application"; Flags: ignoreversion recursesubdirs createallsubdirs
; The runtime (node.exe)
Source: "..\build\UIAP\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs
; The start script
Source: "..\build\UIAP\start.bat"; DestDir: "{app}"; Flags: ignoreversion
; Pre-create the mutable data directories. We do NOT overwrite existing data files on updates.
Source: "..\build\UIAP\data\*"; DestDir: "{app}\data"; Flags: ignoreversion recursesubdirs createallsubdirs uninsneveruninstall

; PostgreSQL binaries (deployed to a sibling UIAP-Database directory)
Source: "..\build\UIAP-Database\pgsql\*"; DestDir: "{localappdata}\UIAP-Database\pgsql"; Flags: ignoreversion recursesubdirs createallsubdirs
; Provisioning scripts
Source: "..\build\UIAP-Database\scripts\*"; DestDir: "{localappdata}\UIAP-Database\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Uninstall UIAP Edge"; Filename: "{uninstallexe}"
Name: "{autodesktop}\UIAP Edge"; Filename: "{app}\UIAP Edge.url"

[INI]
Filename: "{app}\UIAP Edge.url"; Section: "InternetShortcut"; Key: "URL"; String: "http://localhost:3000/"
Filename: "{app}\UIAP Edge.url"; Section: "InternetShortcut"; Key: "IconFile"; String: "{uninstallexe}"
Filename: "{app}\UIAP Edge.url"; Section: "InternetShortcut"; Key: "IconIndex"; String: "0"

[Run]
; Run PostgreSQL provisioning after file extraction (before launching UIAP)
Filename: "{app}\runtime\node.exe"; Parameters: """{localappdata}\UIAP-Database\scripts\provision.js"" --uiap-root ""{app}"""; WorkingDir: "{app}"; StatusMsg: "Provisioning PostgreSQL database..."; Flags: runhidden waituntilterminated
; Install the UIAP-Edge Windows Service
Filename: "{app}\runtime\node.exe"; Parameters: """{app}\application\scripts\windows\install-service.js"""; WorkingDir: "{app}"; StatusMsg: "Installing UIAP Edge Service..."; Flags: runhidden waituntilterminated

[UninstallRun]
; Uninstall the UIAP-Edge Windows Service
Filename: "{app}\runtime\node.exe"; Parameters: """{app}\application\scripts\windows\uninstall-service.js"""; WorkingDir: "{app}"; Flags: runhidden waituntilterminated

[UninstallDelete]
; Clean up logs during uninstall but keep modules and backups.
; The user should manually delete the data folder if they want complete removal.
Type: files; Name: "{app}\data\logs\*.log"
Type: dirifempty; Name: "{app}\data\logs"
Type: dirifempty; Name: "{app}\data\configuration"
Type: dirifempty; Name: "{app}\data\modules\installed"
Type: dirifempty; Name: "{app}\data\modules"
Type: dirifempty; Name: "{app}\data\backups"
Type: dirifempty; Name: "{app}\data"
Type: files; Name: "{app}\UIAP Edge.url"
Type: dirifempty; Name: "{app}"
