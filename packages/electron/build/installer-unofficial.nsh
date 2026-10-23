; Windows Open With registration for this edition only. The standard builder
; APP_ASSOCIATE also overwrites extension defaults; do not use it here.
; Keep build.win.fileAssociations empty so built-in cleanup cannot undo this
; policy. Never register a URL scheme or write Explorer UserChoice.

!macro customInstall
  WriteRegStr SHELL_CONTEXT "Software\Classes\${APP_ID}.Markdown" "" "Markdown ドキュメント"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${APP_ID}.Markdown\DefaultIcon" "" `"$INSTDIR\${APP_EXECUTABLE_FILENAME}",0`
  WriteRegStr SHELL_CONTEXT "Software\Classes\${APP_ID}.Markdown\shell" "" "open"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${APP_ID}.Markdown\shell\open" "" "${PRODUCT_NAME}で開く"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${APP_ID}.Markdown\shell\open\command" "" `"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"`
  WriteRegNone SHELL_CONTEXT "Software\Classes\.md\OpenWithProgids" "${APP_ID}.Markdown"
  WriteRegNone SHELL_CONTEXT "Software\Classes\.markdown\OpenWithProgids" "${APP_ID}.Markdown"
!macroend

!macro customUnInstall
  ; A newer or moved installation may now own the same edition's ProgID.
  ; Do not remove its entries when running a different installation's uninstaller.
  ReadRegStr $R0 SHELL_CONTEXT "Software\Classes\${APP_ID}.Markdown\shell\open\command" ""
  StrCmp $R0 `"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"` 0 unofficial_associations_done
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.md\OpenWithProgids" "${APP_ID}.Markdown"
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.markdown\OpenWithProgids" "${APP_ID}.Markdown"
  DeleteRegKey SHELL_CONTEXT "Software\Classes\${APP_ID}.Markdown"
  unofficial_associations_done:
!macroend
