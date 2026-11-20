// SPDX-License-Identifier: GPL-2.0-or-later

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {formatJsonErrorMessage, parseCustomActions} from './lib/custom-actions.js';
import {areAllActionsHidden, normalizeActionOrder} from './lib/action-preferences.js';
import {LAYOUT_METADATA} from './lib/layouts/metadata.js';
import {resetSettings} from './lib/settings-reset.js';
import {STATUS_HEADER_DENSITIES, normalizeStatusHeaderDensity} from './lib/status-header.js';
import {getThemeSource, getThemeSourcePaths} from './lib/theme.js';
import {createPreferencesExport, parsePreferencesImport} from './lib/preferences-io.js';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const STYLE_NAMES = Object.keys(LAYOUT_METADATA);
const STYLE_LABELS = Object.fromEntries(
    Object.entries(LAYOUT_METADATA).map(([id, metadata]) =>
        [id, `${metadata.displayName} — ${metadata.description}`]
    )
);

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
        const makePage = (title, iconName) => new Adw.PreferencesPage({
            title,
            icon_name: iconName,
        });
        const menuPage = makePage('Menu', 'system-shutdown-symbolic');
        const behaviorPage = makePage('Behavior', 'preferences-system-symbolic');
        const appearancePage = makePage('Appearance', 'applications-graphics-symbolic');
        const advancedPage = makePage('Advanced', 'preferences-other-symbolic');
        window.default_width = 760;
        window.default_height = 820;
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
        const addRowIcon = (row, iconName) => {
            row.add_prefix(new Gtk.Image({icon_name: iconName}));
        };
        // Settings outlive a preferences window. Avoid retaining closed rows
        // through signal closures when the user opens Preferences repeatedly.
        window.connect('close-request', () => {
            disconnectSettingsSignals();
            return false;
        });

        const introGroup = new Adw.PreferencesGroup();
        const introRow = new Adw.ActionRow({
            title: 'Material System Actions',
            subtitle: 'Customize the look, behavior, and shortcuts of your system actions menu.',
        });
        introRow.add_prefix(new Gtk.Image({
            icon_name: 'system-shutdown-symbolic',
            pixel_size: 32,
        }));
        introGroup.add(introRow);
        menuPage.add(introGroup);

        const styleGroup = new Adw.PreferencesGroup({
            title: 'Menu style',
            description: 'Choose how the system actions menu looks and feels.',
        });
        const styleRow = new Adw.ComboRow({
            title: 'System actions style',
            subtitle: `${STYLE_NAMES.length} generic layouts — see README for descriptions and recommendations`,
            model: Gtk.StringList.new(STYLE_NAMES.map(n => STYLE_LABELS[n] ?? n)),
        });
        addRowIcon(styleRow, 'applications-graphics-symbolic');
        const current = settings.get_string('style');
        // migrate old tool names to generic
        const migrated = ({rofi: 'list', quickshell: 'split', wlogout: 'tiles', dots: 'halo', end4: 'capsule'})[current] ?? current;
        const idx = STYLE_NAMES.indexOf(migrated);
        styleRow.selected = idx === -1 ? 0 : idx;
        if (migrated !== current)
            settings.set_string('style', migrated);
        styleGroup.add(styleRow);
        const previewRow = new Adw.ActionRow({ title: 'Preview selected layout', subtitle: 'Preview without saving, or apply this layout as your default.' });
        const previewButton = new Gtk.Button({label: 'Preview', valign: Gtk.Align.CENTER});
        const applyButton = new Gtk.Button({label: 'Apply', valign: Gtk.Align.CENTER, css_classes: ['suggested-action'], sensitive: STYLE_NAMES[styleRow.selected] !== settings.get_string('style')});
        const updateStyleApplyState = () => {
            const isPending = STYLE_NAMES[styleRow.selected] !== settings.get_string('style');
            applyButton.sensitive = isPending;
            previewRow.subtitle = isPending
                ? 'Preview without saving, or apply this layout as your default.'
                : 'Current default selected. Preview remains available.';
        };
        styleRow.connect('notify::selected', updateStyleApplyState);
        applyButton.connect('clicked', () => {
            settings.set_string('style', STYLE_NAMES[styleRow.selected]);
            updateStyleApplyState();
        });
        previewRow.add_suffix(previewButton); previewRow.add_suffix(applyButton); styleGroup.add(previewRow);
        previewButton.connect('clicked', () => {
            previewButton.sensitive = false;
            Gio.DBus.session.call('org.gnome.Shell.Extensions.MaterialSystemActions', '/org/gnome/Shell/Extensions/MaterialSystemActions', 'org.gnome.Shell.Extensions.MaterialSystemActions', 'Preview', new GLib.Variant('(s)', [STYLE_NAMES[styleRow.selected]]), null, Gio.DBusCallFlags.NONE, 3000, null, (connection, result) => {
                try { connection.call_finish(result); }
                catch (error) { previewRow.subtitle = 'Could not open preview: ' + error.message; }
                finally { previewButton.sensitive = true; }
            });
        });
        menuPage.add(styleGroup);

        const ACTIONS = [
            {id: 'lock', label: 'Lock', description: 'Lock the current session'},
            {id: 'logout', label: 'Log out', description: 'End the current session'},
            {id: 'suspend', label: 'Suspend', description: 'Suspend the computer'},
            {id: 'hibernate', label: 'Hibernate', description: 'Save the session to disk and power off, when supported'},
            {id: 'reboot', label: 'Reboot', description: 'Restart the computer'},
            {id: 'shutdown', label: 'Shutdown', description: 'Power off the computer'},
        ];
        const actionGroup = new Adw.PreferencesGroup({
            title: 'System actions',
            description: 'Choose which actions appear and set their display order. Changes apply the next time the popup opens.',
        });
        const actionRows = new Map();
        const allHiddenRow = new Adw.ActionRow({
            title: 'All actions are hidden',
            subtitle: 'The popup will have no actions. Enable at least one action above to restore it.',
        });
        allHiddenRow.add_prefix(new Gtk.Image({icon_name: 'dialog-warning-symbolic'}));
        // AdwPreferencesGroup wraps rows in an internal GtkListBox, so
        // allHiddenRow.get_parent() is never the group itself. Track
        // visibility explicitly instead of comparing parents.
        let allHiddenVisible = false;
        const updateAllHiddenWarning = () => {
            const availableActions = getConfigurableActions();
            const order = normalizeActionOrder(availableActions, settings.get_strv('action-order'));
            const hidden = new Set(settings.get_strv('hidden-actions'));
            const shouldWarn = areAllActionsHidden(order, hidden);
            if (shouldWarn && !allHiddenVisible) {
                actionGroup.add(allHiddenRow);
                allHiddenVisible = true;
            } else if (!shouldWarn && allHiddenVisible) {
                actionGroup.remove(allHiddenRow);
                allHiddenVisible = false;
            }
        };
        const getConfigurableActions = () => {
            let custom = [];
            try {
                custom = parseCustomActions(settings.get_string('custom-actions')).map(action => ({
                    id: action.id,
                    label: action.label,
                    description: action.destructive ? 'Custom command · confirmation required' : 'Custom command · runs immediately',
                }));
            } catch (_e) {
                // Keep Preferences usable if the stored JSON was edited outside this editor.
            }
            return [...ACTIONS, ...custom];
        };
        const renderActionRows = () => {
            for (const row of actionRows.values()) actionGroup.remove(row);
            actionRows.clear();
            const availableActions = getConfigurableActions();
            const order = normalizeActionOrder(availableActions, settings.get_strv('action-order'));
            const hidden = new Set(settings.get_strv('hidden-actions'));
            for (const id of order) {
                const action = availableActions.find(item => item.id === id);
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
            updateAllHiddenWarning();
        };
        const moveAction = (id, delta) => {
            const order = normalizeActionOrder(getConfigurableActions(), settings.get_strv('action-order'));
            const index = order.indexOf(id), target = index + delta;
            if (index < 0 || target < 0 || target >= order.length) return;
            [order[index], order[target]] = [order[target], order[index]];
            settings.set_strv('action-order', order);
            renderActionRows();
        };
        renderActionRows();
        settingsSignalIds.push(settings.connect('changed::custom-actions', renderActionRows));
        settingsSignalIds.push(settings.connect('changed::hidden-actions', updateAllHiddenWarning));
        menuPage.add(actionGroup);

        const powerBehaviorGroup = new Adw.PreferencesGroup({
            title: 'Power actions',
            description: 'Optional safeguards for disruptive power operations.',
        });
        const powerCountdownRow = new Adw.ActionRow({
            title: 'Countdown before shutdown or reboot',
            subtitle: 'After confirmation, wait five seconds with a Cancel option. Disabled by default.',
        });
        addRowIcon(powerCountdownRow, 'alarm-symbolic');
        const powerCountdownSwitch = new Gtk.Switch({
            active: settings.get_boolean('power-countdown-enabled'),
            valign: Gtk.Align.CENTER,
        });
        powerCountdownSwitch.connect('notify::active', () =>
            settings.set_boolean('power-countdown-enabled', powerCountdownSwitch.active));
        powerCountdownRow.add_suffix(powerCountdownSwitch);
        powerBehaviorGroup.add(powerCountdownRow);
        behaviorPage.add(powerBehaviorGroup);

        const switchUserGroup = new Adw.PreferencesGroup({
            title: 'Switch users',
            description: 'Switching sessions can interrupt unsaved work.',
        });
        const confirmSwitchUserRow = new Adw.ActionRow({
            title: 'Confirm before switching users',
            subtitle: 'Ask before activating another user session. Enabled by default; changes apply next time the popup opens.',
        });
        addRowIcon(confirmSwitchUserRow, 'system-users-symbolic');
        const confirmSwitchUserSwitch = new Gtk.Switch({
            active: settings.get_boolean('confirm-switch-user'),
            valign: Gtk.Align.CENTER,
        });
        confirmSwitchUserSwitch.connect('notify::active', () =>
            settings.set_boolean('confirm-switch-user', confirmSwitchUserSwitch.active));
        confirmSwitchUserRow.add_suffix(confirmSwitchUserSwitch);
        switchUserGroup.add(confirmSwitchUserRow);
        behaviorPage.add(switchUserGroup);

        const customGroup = new Adw.PreferencesGroup({
            title: 'Custom actions',
            description: 'Add commands such as VPN toggles or backup scripts. Commands are trusted code and run as your user.',
        });
        const customRow = new Adw.ActionRow({
            title: 'Custom command list',
            subtitle: 'Edit a JSON array; each command is launched directly, without a shell.',
        });
        addRowIcon(customRow, 'system-run-symbolic');
        const customButton = new Gtk.Button({label: 'Edit JSON', valign: Gtk.Align.CENTER});
        customRow.add_suffix(customButton);
        customGroup.add(customRow);
        advancedPage.add(customGroup);
        customButton.connect('clicked', () => {
            const editor = new Gtk.Window({
                title: 'Custom actions (JSON)', transient_for: window, modal: true,
                default_width: 620, default_height: 520,
            });
            const editorBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL, spacing: 12,
                margin_top: 16, margin_bottom: 16, margin_start: 16, margin_end: 16,
            });
            const help = new Gtk.Label({
                label: 'Each item needs id (custom-*), label, icon, and cmd (an argv array). confirm defaults to true; key is an optional unused letter. Never paste commands from untrusted sources.',
                wrap: true, xalign: 0,
            });
            const scroll = new Gtk.ScrolledWindow({vexpand: true, hexpand: true});
            const textView = new Gtk.TextView({monospace: true, wrap_mode: Gtk.WrapMode.NONE});
            textView.buffer.text = settings.get_string('custom-actions') || '[]';
            scroll.set_child(textView);
            const status = new Gtk.Label({xalign: 0, wrap: true});
            const setStatus = (message, kind) => {
                status.label = message;
                status.remove_css_class('error');
                status.remove_css_class('success');
                if (kind) status.add_css_class(kind);
            };
            const showError = error =>
                setStatus(formatJsonErrorMessage(textView.buffer.text, error), 'error');
            const buttons = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 8, halign: Gtk.Align.END});
            const template = new Gtk.Button({label: 'Add action template'});
            const format = new Gtk.Button({label: 'Format JSON'});
            const cancel = new Gtk.Button({label: 'Cancel'});
            const save = new Gtk.Button({label: 'Validate and save', css_classes: ['suggested-action']});
            buttons.append(template); buttons.append(format); buttons.append(cancel); buttons.append(save);
            editorBox.append(help); editorBox.append(scroll); editorBox.append(status); editorBox.append(buttons);
            editor.set_child(editorBox);
            cancel.connect('clicked', () => editor.close());
            template.connect('clicked', () => {
                let actions;
                try {
                    const parsed = JSON.parse(textView.buffer.text);
                    actions = Array.isArray(parsed) ? parsed : [];
                } catch (_e) {
                    actions = [];
                }
                let index = 1;
                let id = `custom-action-${index}`;
                while (actions.some(item => item?.id === id)) id = `custom-action-${++index}`;
                actions.push({
                    id, label: 'New action', icon: 'dialog-information-symbolic',
                    cmd: ['/usr/bin/true'], confirm: true, key: '',
                });
                textView.buffer.text = JSON.stringify(actions, null, 2);
                setStatus('Template added. Edit the fields, then validate and save.', 'success');
            });
            format.connect('clicked', () => {
                try {
                    const parsed = JSON.parse(textView.buffer.text);
                    textView.buffer.text = JSON.stringify(parsed, null, 2);
                    setStatus('JSON formatted.', 'success');
                } catch (error) {
                    showError(error);
                }
            });
            save.connect('clicked', () => {
                const serialized = textView.buffer.text;
                try {
                    parseCustomActions(serialized);
                    settings.set_string('custom-actions', serialized);
                    setStatus('Saved. Reopen the popup to use the updated actions.', 'success');
                } catch (error) {
                    showError(error);
                }
            });
            editor.present();
        });

        const keybindGroup = new Adw.PreferencesGroup({
            title: 'Keyboard shortcut',
            description: 'Open the menu quickly from anywhere. Default: Ctrl+Alt+End.',
        });
        const keybindRow = new Adw.ActionRow({title: 'Toggle system actions'});
        addRowIcon(keybindRow, 'input-keyboard-symbolic');
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
        behaviorPage.add(keybindGroup);

        const focusGroup = new Adw.PreferencesGroup({
            title: 'Keyboard navigation',
            description: 'Choose where keyboard focus starts when the menu opens.',
        });
        const focusIds = ['auto', 'lock', 'lock-suspend', 'logout', 'suspend', 'hibernate', 'hybrid-sleep', 'reboot', 'shutdown'];
        const focusRow = new Adw.ComboRow({
            title: 'Default focused action',
            subtitle: 'Choose the initial keyboard focus. Hidden or unavailable actions fall back to the first visible action.',
            model: new Gtk.StringList({strings: ['Automatic', 'Lock', 'Lock & Suspend', 'Log out', 'Suspend', 'Hibernate', 'Hybrid Sleep', 'Reboot', 'Shutdown']}),
        });
        addRowIcon(focusRow, 'focus-windows-symbolic');
        const updateFocusSelection = () => {
            const index = focusIds.indexOf(settings.get_string('default-focused-action'));
            focusRow.selected = Math.max(0, index);
        };
        updateFocusSelection();
        focusRow.connect('notify::selected', () => {
            const id = focusIds[focusRow.selected];
            if (id)
                settings.set_string('default-focused-action', id);
        });
        settingsSignalIds.push(settings.connect('changed::default-focused-action', updateFocusSelection));
        focusGroup.add(focusRow);

        const digitRow = new Adw.SwitchRow({
            title: 'Show digit hints',
            subtitle: 'Display 1–9 badges in layouts that support them; shortcuts work even when hidden',
        });
        addRowIcon(digitRow, 'input-keyboard-symbolic');
        digitRow.active = settings.get_boolean('show-digit-hints');
        digitRow.connect('notify::active', () => settings.set_boolean('show-digit-hints', digitRow.active));
        settingsSignalIds.push(settings.connect('changed::show-digit-hints', () => {
            const enabled = settings.get_boolean('show-digit-hints');
            if (digitRow.active !== enabled)
                digitRow.active = enabled;
        }));
        focusGroup.add(digitRow);
        behaviorPage.add(focusGroup);

        const appearance = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Adjust scale, transparency, status details, and backdrop dimming.',
        });
        const scaleRow = new Adw.SpinRow({
            title: 'UI scale',
            subtitle: 'Zoom the whole popup — text, icons, and geometry',
            adjustment: new Gtk.Adjustment({
                lower: 0.6, upper: 2.0, step_increment: 0.05, value: settings.get_double('icon-scale'),
            }),
            digits: 2,
        });
        addRowIcon(scaleRow, 'zoom-in-symbolic');
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
        addRowIcon(opacityRow, 'weather-clear-symbolic');
        opacityRow.connect('notify::value', () => settings.set_double('panel-opacity', opacityRow.value));
        // keep in sync if changed elsewhere
        settingsSignalIds.push(settings.connect('changed::panel-opacity', () => {
            const v = settings.get_double('panel-opacity');
            if (Math.abs(opacityRow.value - v) > 0.001) opacityRow.value = v;
        }));
        appearance.add(opacityRow);

        const statusRow = new Adw.SwitchRow({
            title: 'Show status information',
            subtitle: 'Show or hide user, clock, date, and uptime details where the layout provides them',
        });
        addRowIcon(statusRow, 'view-reveal-symbolic');
        statusRow.active = settings.get_boolean('show-status-header');
        statusRow.connect('notify::active', () => settings.set_boolean('show-status-header', statusRow.active));
        settingsSignalIds.push(settings.connect('changed::show-status-header', () => {
            if (statusRow.active !== settings.get_boolean('show-status-header'))
                statusRow.active = settings.get_boolean('show-status-header');
        }));
        appearance.add(statusRow);

        const densityRow = new Adw.ComboRow({
            title: 'Status header density',
            subtitle: 'Compact reduces spacing and text size. Only layouts with the shared status header are affected.',
            model: new Gtk.StringList({strings: ['Comfortable', 'Compact']}),
        });
        addRowIcon(densityRow, 'view-list-symbolic');
        densityRow.selected = STATUS_HEADER_DENSITIES.indexOf(
            normalizeStatusHeaderDensity(settings.get_string('status-header-density')));
        densityRow.connect('notify::selected', () => {
            const density = STATUS_HEADER_DENSITIES[densityRow.selected];
            if (density)
                settings.set_string('status-header-density', density);
        });
        settingsSignalIds.push(settings.connect('changed::status-header-density', () => {
            const selected = STATUS_HEADER_DENSITIES.indexOf(
                normalizeStatusHeaderDensity(settings.get_string('status-header-density')));
            if (densityRow.selected !== selected)
                densityRow.selected = selected;
        }));
        appearance.add(densityRow);

        const dimRow = new Adw.SwitchRow({
            title: 'Dim backdrop',
            subtitle: 'Dim the desktop behind the popup',
        });
        addRowIcon(dimRow, 'weather-clear-night-symbolic');
        dimRow.active = settings.get_boolean('backdrop-dim-enabled');
        dimRow.connect('notify::active', () => settings.set_boolean('backdrop-dim-enabled', dimRow.active));
        settingsSignalIds.push(settings.connect('changed::backdrop-dim-enabled', () => {
            if (dimRow.active !== settings.get_boolean('backdrop-dim-enabled'))
                dimRow.active = settings.get_boolean('backdrop-dim-enabled');
        }));
        appearance.add(dimRow);

        const strongDimRow = new Adw.SwitchRow({
            title: 'Stronger backdrop dim',
            subtitle: 'Darken the desktop further. Has no effect while Dim backdrop is off.',
            sensitive: dimRow.active,
        });
        strongDimRow.active = settings.get_boolean('backdrop-strong-enabled');
        strongDimRow.connect('notify::active', () => settings.set_boolean('backdrop-strong-enabled', strongDimRow.active));
        settingsSignalIds.push(settings.connect('changed::backdrop-strong-enabled', () => {
            strongDimRow.active = settings.get_boolean('backdrop-strong-enabled');
        }));
        dimRow.connect('notify::active', () => { strongDimRow.sensitive = dimRow.active; });
        appearance.add(strongDimRow);

        const themeSourceRow = new Adw.ActionRow({
            title: 'Theme source',
            subtitle: getThemeSource() ?? 'Fallback theme',
        });
        addRowIcon(themeSourceRow, 'color-select-symbolic');
        const refreshThemeSource = () => {
            themeSourceRow.subtitle = getThemeSource() ?? 'Fallback theme';
        };
        // Watch both the candidate directories and their parents so the row
        // updates when a Matugen file is created, replaced, or removed.
        const themeDirectories = new Set();
        for (const path of getThemeSourcePaths()) {
            const file = Gio.File.new_for_path(path);
            let dir = file.get_parent();
            for (let depth = 0; dir && depth < 2; depth++) {
                if (dir.query_exists(null))
                    themeDirectories.add(dir.get_path());
                dir = dir.get_parent();
            }
        }
        this._themeMonitors = [];
        for (const path of themeDirectories) {
            try {
                const monitor = Gio.File.new_for_path(path).monitor(Gio.FileMonitorFlags.NONE, null);
                monitor.connect('changed', refreshThemeSource);
                this._themeMonitors.push(monitor);
            } catch (_e) {}
        }
        appearance.add(themeSourceRow);
        appearancePage.add(appearance);


        const resetGroup = new Adw.PreferencesGroup({
            title: 'Reset preferences',
            description: 'Restore selected settings to their defaults. Destructive resets ask for confirmation.',
        });
        const refreshAfterReset = () => {
            const styleIndex = STYLE_NAMES.indexOf(settings.get_string('style'));
            styleRow.selected = styleIndex === -1 ? 0 : styleIndex;
            updateStyleApplyState();
            renderActionRows();
            confirmSwitchUserSwitch.active = settings.get_boolean('confirm-switch-user');
            powerCountdownSwitch.active = settings.get_boolean('power-countdown-enabled');
            updateLabel();
            updateFocusSelection();
            scaleRow.value = settings.get_double('icon-scale');
            opacityRow.value = settings.get_double('panel-opacity');
            statusRow.active = settings.get_boolean('show-status-header');
            densityRow.selected = STATUS_HEADER_DENSITIES.indexOf(
                normalizeStatusHeaderDensity(settings.get_string('status-header-density')));
            dimRow.active = settings.get_boolean('backdrop-dim-enabled');
            strongDimRow.active = settings.get_boolean('backdrop-strong-enabled');
            strongDimRow.sensitive = dimRow.active;
        };
        const applyReset = group => {
            resetSettings(settings, group);
            refreshAfterReset();
        };
        const confirmReset = (group, heading, body) => {
            const dialog = new Adw.MessageDialog({
                transient_for: window,
                modal: true,
                heading,
                body,
            });
            dialog.add_response('cancel', 'Cancel');
            dialog.add_response('reset', 'Reset');
            dialog.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);
            dialog.set_default_response('cancel');
            dialog.set_close_response('cancel');
            dialog.connect('response', (_dialog, response) => {
                if (response === 'reset')
                    applyReset(group);
            });
            dialog.present();
        };
        const addResetRow = (title, subtitle, buttonLabel, callback, destructive = false) => {
            const row = new Adw.ActionRow({title, subtitle});
            const button = new Gtk.Button({
                label: buttonLabel,
                valign: Gtk.Align.CENTER,
                css_classes: destructive ? ['destructive-action'] : ['flat'],
            });
            button.connect('clicked', callback);
            row.add_suffix(button);
            resetGroup.add(row);
        };
        addResetRow(
            'Appearance',
            'Restore scale, transparency, status information, header density, and backdrop dimming.',
            'Reset',
            () => applyReset('appearance'),
        );
        addResetRow(
            'Action settings',
            'Restore layout, action order and visibility, focus, switch-user confirmation, and shortcut.',
            'Reset',
            () => applyReset('actions'),
        );
        addResetRow(
            'Custom actions',
            'Remove all saved custom command definitions. This does not execute any command.',
            'Remove',
            () => confirmReset(
                'custom',
                'Remove all custom actions?',
                'This permanently removes your saved custom command definitions. Other preferences will remain unchanged.'
            ),
            true,
        );
        addResetRow(
            'All preferences',
            'Restore every setting, including the global shortcut and custom actions.',
            'Reset all',
            () => confirmReset(
                'all',
                'Reset all preferences?',
                'This restores every setting to its schema default and removes all saved custom actions. This cannot be undone.'
            ),
            true,
        );
        advancedPage.add(resetGroup);

        const backupGroup = new Adw.PreferencesGroup({
            title: 'Preferences backup',
            description: 'Export layout, action order/visibility, and custom actions for dotfiles, or import a validated snapshot.',
        });
        const backupRow = new Adw.ActionRow({
            title: 'Preferences JSON',
            subtitle: 'Copy the exported JSON, or paste a snapshot to import it. Commands are never executed on import.',
        });
        addRowIcon(backupRow, 'document-save-symbolic');
        const openJsonWindow = (title, initialText, applyLabel, onApply) => {
            const dialog = new Gtk.Window({
                title, transient_for: window, modal: true,
                default_width: 620, default_height: 480,
            });
            const box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL, spacing: 12,
                margin_top: 16, margin_bottom: 16, margin_start: 16, margin_end: 16,
            });
            const scroll = new Gtk.ScrolledWindow({vexpand: true, hexpand: true});
            const textView = new Gtk.TextView({monospace: true, wrap_mode: Gtk.WrapMode.NONE});
            textView.buffer.text = initialText;
            scroll.set_child(textView);
            const status = new Gtk.Label({xalign: 0, wrap: true});
            const buttons = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL, spacing: 8, halign: Gtk.Align.END,
            });
            const close = new Gtk.Button({label: 'Close'});
            close.connect('clicked', () => dialog.close());
            buttons.append(close);
            const setStatus = (message, kind) => {
                status.label = message;
                status.remove_css_class('error');
                status.remove_css_class('success');
                if (kind) status.add_css_class(kind);
            };
            if (onApply) {
                const apply = new Gtk.Button({label: applyLabel, css_classes: ['suggested-action']});
                apply.connect('clicked', () => {
                    try {
                        onApply(textView.buffer.text);
                        setStatus('Imported. Review the updated controls.', 'success');
                    } catch (error) {
                        setStatus(error.message, 'error');
                    }
                });
                buttons.append(apply);
            }
            box.append(scroll); box.append(status); box.append(buttons);
            dialog.set_child(box);
            dialog.present();
        };
        const exportButton = new Gtk.Button({label: 'Export', valign: Gtk.Align.CENTER});
        exportButton.connect('clicked', () => {
            const values = {
                style: settings.get_string('style'),
                'action-order': settings.get_strv('action-order'),
                'hidden-actions': settings.get_strv('hidden-actions'),
                'custom-actions': settings.get_string('custom-actions'),
            };
            openJsonWindow('Preferences export', createPreferencesExport(values), null, null);
        });
        const importButton = new Gtk.Button({label: 'Import', valign: Gtk.Align.CENTER});
        importButton.connect('clicked', () => {
            openJsonWindow('Preferences import', '{\n  "version": 1,\n  "settings": {}\n}\n', 'Validate and import', text => {
                const values = parsePreferencesImport(text);
                // Validate the command definitions without ever running them.
                parseCustomActions(values['custom-actions'] ?? '[]');
                if (values.style !== undefined) settings.set_string('style', values.style);
                if (values['action-order'] !== undefined) settings.set_strv('action-order', values['action-order']);
                if (values['hidden-actions'] !== undefined) settings.set_strv('hidden-actions', values['hidden-actions']);
                if (values['custom-actions'] !== undefined) settings.set_string('custom-actions', values['custom-actions']);
                refreshAfterReset();
            });
        });
        backupRow.add_suffix(exportButton);
        backupRow.add_suffix(importButton);
        backupGroup.add(backupRow);
        advancedPage.add(backupGroup);

        window.add(menuPage);
        window.add(behaviorPage);
        window.add(appearancePage);
        window.add(advancedPage);
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
