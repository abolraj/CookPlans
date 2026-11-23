It is a Tauri app CookPlans; detailed more in readme;
Please reaserch about Tauri & Tauri plugin development (android)
we wanna add some features;
handle these :
+ we shuold handle the mobile alarmed the user with a dismiss btn until the dismiss not clicked an alarm should be done like native alarms of mobiles with a sound effect 
+ we shuold add a custom android plugin for fullscren intent for waking uo screen when aleted even closed apps
+ a custom notificaition styles for icon, card, dismiss btn (matched app styles)
+ a togglable btn in footer user chooses for activating alarms or not (when tried to enable match the permissions granted ottherwise alarmed to grant relevant permissions list box (replacing src/components/NotificationPermissionModal to PermissionsModal))


convert drawable-xxxhdpi/pot.png \
        -fill white -colorize 100 \
        -resize 96x96 \
        white_pot_96.png

adb shell am start-foreground-service \
  -n com.cookplans.app/com.cookplans.alarm.AlarmService \
  -e title "Test" -e body "Hello" -e step "Step" -e food "Food"