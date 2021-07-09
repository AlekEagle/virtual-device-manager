'use strict';

import { Tray, Menu, MenuItem } from 'electron';
import path from 'path';
import Main from '../background';
declare let __static: string;

const tray = new Tray(path.join(__static, 'logo.png'));
tray.setToolTip('Virtual Device Manager');
let menu = new Menu();
menu.append(
  new MenuItem({
    label: 'Virtual Device Manager',
    enabled: false,
    icon: path.join(__static, 'tray.png')
  })
);
menu.append(
  new MenuItem({
    type: 'separator'
  })
);
menu.append(
  new MenuItem({
    label: 'Open Virtual Device Manager',
    click: Main.createWindow
  })
);
menu.append(
  new MenuItem({
    type: 'separator'
  })
);
menu.append(
  new MenuItem({
    role: 'quit'
  })
);
tray.on('double-click', Main.createWindow);
tray.setContextMenu(menu);
export default {
  tray
};
