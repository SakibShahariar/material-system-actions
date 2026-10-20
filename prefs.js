// SPDX-License-Identifier: GPL-2.0-or-later

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const STYLE_NAMES = [
    'card', 'list', 'split', 'grid', 'radial', 'bento', 'tui', 'dock',
    'tiles', 'halo', 'capsule', 'circles', 'avatar', 'pill', 'banner',
];

// label shown in prefs — generic, no tool/dotfiles name
const STYLE_LABELS = {
    card: 'Card — header + pill buttons',
    list: 'List — keyboard-first, key badges',
    split: 'Split — big clock + circular dock',
    grid: 'Grid — numbered icon tiles',
    radial: 'Radial — icons around clock hub',
    bento: 'Bento — asymmetric dashboard',
    tui: 'TUI — whiptail box-drawing',
    dock: 'Dock — edge vertical dock',
    tiles: 'Tiles — square tile row',
    halo: 'Halo — dot-ring hold-to-confirm',
    capsule: 'Capsule — rounded pill rows',
    circles: 'Circles — floating stack',
    avatar: 'Avatar — big avatar + list',
    pill: 'Pill — compact status + icons',
    banner: 'Banner — wallpaper + icons',
};

const MODIFIER_KEYVALS = new Set([
    Gdk.KEY_Shift_L, Gdk.KEY_Shift_R,
    Gdk.KEY_Control_L, Gdk.KEY_Control_R,
    Gdk.KEY_Alt_L, Gdk.KEY_Alt_R,
    Gdk.KEY_Super_L, Gdk.KEY_Super_R,
    Gdk.KEY_Meta_L, Gdk.KEY_Meta_R,
    Gdk.KEY_ISO_Level3_Shift,
]);

export default class MaterialSystemActionsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        const settingsSignalIds = [];
        let signalsDisconnected = false;
        const disconnectSettingsSignals = () => {
            if (signalsDisconnected)
                return;
            signalsDisconnected = true;
            for (const id of settingsSignalIds) {
                try { settings.disconnect(id); } catch (_e) {}
            }
            settingsSignalIds.length = 0;
        };
        // Settings outlive a preferences window. Avoid retaining closed rows
        // through signal closures when the user opens Preferences repeatedly.
        window.connect('close-request', () => {
            disconnectSettingsSignals();
            return false;
        });

        const styleGroup = new Adw.PreferencesGroup({title: 'Style'});
        const styleRow = new Adw.ComboRow({
            title: 'System actions style',
            subtitle: '15 generic layouts (renamed from tool names) — see README',
            model: Gtk.StringList.new(STYLE_NAMES.map(n => STYLE_LABELS[n] ?? n)),
        });
        const current = settings.get_string('style');
        // migrate old tool names to generic
        const migrated = ({rofi: 'list', quickshell: 'split', wlogout: 'tiles', dots: 'halo', end4: 'capsule'})[current] ?? current;
        const idx = STYLE_NAMES.indexOf(migrated);
        styleRow.selected = idx === -1 ? 0 : idx;
        if (migrated !== current)
            settings.set_string('style', migrated);
        styleRow.connect('notify::selected', () => {
            settings.set_string('style', STYLE_NAMES[styleRow.selected]);
        });
        styleGroup.add(styleRow);
        page.add(styleGroup);

        const ACTIONS = [
            {id: 'lock', label: 'Lock', description: 'Lock the current session'},
            {id: 'logout', label: 'Log out', description: 'End the current session'},
            {id: 'suspend', label: 'Suspend', description: 'Suspend the computer'},
            {id: 'reboot', label: 'Reboot', description: 'Restart the computer'},
            {id: 'shutdown', label: 'Shutdown', description: 'Power off the computer'},
        ];
        const actionGroup = new Adw.PreferencesGroup({
            title: 'System actions',
            description: 'Choose which actions appear and set their display order. Changes apply the next time the popup opens.',
        });
        const actionRows = new Map();
        const renderActionRows = () => {
            for (const row of actionRows.values()) actionGroup.remove(row);
            actionRows.clear();
            const order = settings.get_strv('action-order');
            const hidden = new Set(settings.get_strv('hidden-actions'));
            for (const id of order) {
                const action = ACTIONS.find(item => item.id === id);
                if (!action) continue;
                const row = new Adw.ActionRow({title: action.label, subtitle: action.description});
                const toggle = new Gtk.Switch({active: !hidden.has(id), valign: Gtk.Align.CENTER, tooltip_text: `Show ${action.label}`});
                toggle.connect('notify::active', () => {
                    const nextHidden = new Set(settings.get_strv('hidden-actions'));
                    if (toggle.active) nextHidden.delete(id); else nextHidden.add(id);
                    settings.set_strv('hidden-actions', [...nextHidden]);
                });
                row.add_suffix(toggle);
                const index = order.indexOf(id);
                const up = new Gtk.Button({icon_name: 'go-up-symbolic', valign: Gtk.Align.CENTER, css_classes: ['flat'], tooltip_text: `Move ${action.label} up`, sensitive: index > 0});
                up.connect('clicked', () => moveAction(id, -1));
                const down = new Gtk.Button({icon_name: 'go-down-symbolic', valign: Gtk.Align.CENTER, css_classes: ['flat'], tooltip_text: `Move ${action.label} down`, sensitive: index < order.length - 1});
                down.connect('clicked', () => moveAction(id, 1));
                row.add_suffix(up); row.add_suffix(down);
                actionRows.set(id, row); actionGroup.add(row);
            }
        };
        const moveAction = (id, delta) => {
            const order = settings.get_strv('action-order');
            const index = order.indexOf(id), target = index + delta;
            if (index < 0 || target < 0 || target >= order.length) return;
            [order[index], order[target]] = [order[target], order[index]];
            settings.set_strv('action-order', order);
            renderActionRows();
        };
        renderActionRows();
        page.add(actionGroup);

        const keybindGroup = new Adw.PreferencesGroup({
            title: 'Keyboard shortcut',
            description: 'Default is Ctrl+Alt+End.',
        });
        const keybindRow = new Adw.ActionRow({title: 'Toggle system actions'});
        const shortcutLabel = new Gtk.ShortcutLabel({valign: Gtk.Align.CENTER});
        const updateLabel = () => {
            const [accel] = settings.get_strv('toggle-system-actions');
            shortcutLabel.set_accelerator(accel || '');
        };
        updateLabel();
        const editButton = new Gtk.Button({
            child: shortcutLabel,
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
            tooltip_text: 'Click to record a new shortcut',
        });
        editButton.connect('clicked', () => this._openRecorder(window, settings, updateLabel));
        keybindRow.add_suffix(editButton);
        keybindGroup.add(keybindRow);
        page.add(keybindGroup);

        const appearance = new Adw.PreferencesGroup({title: 'Appearance'});
        const scaleRow = new Adw.SpinRow({
            title: 'UI scale',
            subtitle: 'Zoom the whole popup — text, icons, and geometry',
            adjustment: new Gtk.Adjustment({
                lower: 0.6, upper: 2.0, step_increment: 0.05, value: settings.get_double('icon-scale'),
            }),
            digits: 2,
        });
        scaleRow.connect('notify::value', () => settings.set_double('icon-scale', scaleRow.value));
        appearance.add(scaleRow);

        const opacityRow = new Adw.SpinRow({
            title: 'Panel transparency',
            subtitle: '0% = fully transparent, 100% = solid',
            adjustment: new Gtk.Adjustment({
                lower: 0.0, upper: 1.0, step_increment: 0.05, value: settings.get_double('panel-opacity'),
            }),
            digits: 2,
        });
        opacityRow.connect('notify::value', () => settings.set_double('panel-opacity', opacityRow.value));
        // keep in sync if changed elsewhere
        settingsSignalIds.push(settings.connect('changed::panel-opacity', () => {
            const v = settings.get_double('panel-opacity');
            if (Math.abs(opacityRow.value - v) > 0.001) opacityRow.value = v;
        }));
        appearance.add(opacityRow);

        const dimRow = new Adw.SwitchRow({
            title: 'Dim backdrop',
            subtitle: 'Dim the desktop behind the popup',
        });
        dimRow.active = settings.get_boolean('backdrop-dim-enabled');
        dimRow.connect('notify::active', () => settings.set_boolean('backdrop-dim-enabled', dimRow.active));
        settingsSignalIds.push(settings.connect('changed::backdrop-dim-enabled', () => {
            if (dimRow.active !== settings.get_boolean('backdrop-dim-enabled'))
                dimRow.active = settings.get_boolean('backdrop-dim-enabled');
        }));
        appearance.add(dimRow);
        page.add(appearance);

        window.add(page);
    }

    _openRecorder(parentWindow, settings, updateLabel) {
        const dialog = new Gtk.Window({
            title: 'Set shortcut', transient_for: parentWindow, modal: true,
            default_width: 340, default_height: 140, resizable: false,
        });
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL, spacing: 8,
            margin_top: 28, margin_bottom: 28, margin_start: 24, margin_end: 24,
            halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER,
        });
        box.append(new Gtk.Label({label: 'Press a new key combination…', css_classes: ['title-4']}));
        box.append(new Gtk.Label({label: 'Esc to cancel', css_classes: ['dim-label']}));
        dialog.set_child(box);
        const controller = new Gtk.EventControllerKey();
        controller.connect('key-pressed', (_ctrl, keyval, _keycode, state) => {
            if (keyval === Gdk.KEY_Escape) { dialog.close(); return true; }
            const mods = state & Gtk.accelerator_get_default_mod_mask();
            if (mods === 0 && MODIFIER_KEYVALS.has(keyval)) return true;
            if (Gtk.accelerator_valid(keyval, mods)) {
                const accel = Gtk.accelerator_name(keyval, mods);
                settings.set_strv('toggle-system-actions', [accel]);
                updateLabel();
                dialog.close();
            }
            return true;
        });
        dialog.add_controller(controller);
        dialog.present();
    }
}
