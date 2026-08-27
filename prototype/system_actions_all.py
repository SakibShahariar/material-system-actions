#!/usr/bin/env python3
"""
System Actions — style gallery.

One power/session menu, fifteen interchangeable UI skins. Pick one with:

    system_actions_all.py --style=<name>
    system_actions_all.py <name>            (positional also works)
    system_actions_all.py --list            (print available styles)

Styles:
    card        Header card, tonal pill buttons, SESSION/POWER sections
    rofi        rofi/dmenu-style keyboard-first list, keybind badges
    quickshell  Big clock + circular icon dock, split panel
    grid        rofi grid theme, numbered icon tiles
    radial      Icons on a circle around a clock hub
    bento       Asymmetric importance-weighted dashboard tiles
    tui         Whiptail/dialog box-drawing popup, reverse-video select
    dock        Wayland edge-anchored vertical icon dock
    wlogout     wlogout-style horizontal square tile row
    dots        swaylock dot-ring hold-to-confirm gesture
    end4        end-4/dots-hyprland style rounded pill rows
    circles     Floating vertical circle stack, no card
    avatar      Big avatar + text list menu
    pill        Compact status pill + icon row
    banner      Wallpaper banner + pill + icon row

Colors are never hardcoded here: every style references the Material role
custom properties (var(--primary), var(--primary_container),
var(--error_container), var(--surface), var(--surface_container), etc.)
that matugen writes into the :root block of gtk.css, so a regenerated
matugen palette drives every style automatically. This requires GTK >= 4.16
(the version that added standard CSS custom-property / var() support) --
on older GTK, fall back to the @accent_bg_color-style named-color syntax
instead.
"""

import argparse
import getpass
import math
import os
import shutil
import socket
import subprocess
import sys
from datetime import datetime

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")

from gi.repository import Gtk, Adw, GLib, Gdk


# --------------------------------------------------------------------------
# Shared action data
# --------------------------------------------------------------------------

def get_actions():
    """Returns (session_actions, power_actions), each a list of dicts."""
    session = []
    power = []

    if shutil.which("loginctl"):
        session.append(dict(
            id="lock", label="Lock", icon="system-lock-screen-symbolic",
            cmd=["loginctl", "lock-session"], destructive=False, key="l",
        ))
    if shutil.which("gnome-session-quit"):
        session.append(dict(
            id="logout", label="Log out", icon="system-log-out-symbolic",
            cmd=["gnome-session-quit", "--logout", "--no-prompt"],
            destructive=False, key="o",
        ))
    if shutil.which("systemctl"):
        power.append(dict(
            id="suspend", label="Suspend", icon="weather-clear-night-symbolic",
            cmd=["systemctl", "suspend"], destructive=False, key="s",
        ))
        power.append(dict(
            id="reboot", label="Reboot", icon="system-reboot-symbolic",
            cmd=["systemctl", "reboot"], destructive=True, key="r",
        ))
        power.append(dict(
            id="shutdown", label="Shutdown", icon="system-shutdown-symbolic",
            cmd=["systemctl", "poweroff"], destructive=True, key="p",
        ))

    return session, power


def get_uptime():
    try:
        with open("/proc/uptime", "r") as f:
            secs = int(float(f.read().split()[0]))
        d, h, m = secs // 86400, (secs % 86400) // 3600, (secs % 3600) // 60
        if d:
            return f"{d}d {h}h"
        if h:
            return f"{h}h {m}m"
        return f"{m}m"
    except Exception:
        return "?"


# --------------------------------------------------------------------------
# Shared CSS (namespaced with an "sa-" prefix so styles don't collide).
# Every color reference is a libadwaita named color role or currentColor,
# never a literal hex value.
# --------------------------------------------------------------------------

CSS = """
.sa-mono { font-family: "JetBrains Mono", "Iosevka", "Fira Code", monospace; }

.sa-panel {
    background-color: var(--surface_container_low);
    border-radius: 20px;
    padding: 20px;
}

.sa-panel-flat {
    background-color: var(--surface_container_low);
    border: 1px solid var(--outline_variant);
}

/* ---- pill rows (card / end4 / pill / banner / avatar) ---- */
.sa-text-row {
    border-radius: 8px;
    padding: 6px 8px;
    border-left: 2px solid transparent;
    background-color: transparent;
    box-shadow: none;
}
.sa-text-row:focus { background-color: var(--surface_container); border-left: 2px solid var(--outline); }
.sa-text-row.sa-tier-primary label, .sa-text-row.sa-tier-primary image { color: var(--primary); }
.sa-text-row.sa-tier-primary:focus { border-left: 2px solid var(--primary); }
.sa-text-row.sa-tier-secondary label, .sa-text-row.sa-tier-secondary image { color: var(--on_surface); }
.sa-text-row.sa-tier-secondary:focus { border-left: 2px solid var(--secondary); }
.sa-text-row.sa-tier-error label, .sa-text-row.sa-tier-error image { color: var(--error); }
.sa-text-row.sa-tier-error:focus { border-left: 2px solid var(--error); }

.sa-grid-seam { background-color: var(--outline_variant); }

.sa-guide-circle {
    border-radius: 999px;
    border: 1px dashed var(--outline_variant);
}

.sa-banner-badge {
    background-color: alpha(var(--surface), 0.85);
    border-radius: 999px;
    padding: 4px 10px 4px 4px;
}

.sa-header-pill {
    background-color: var(--surface_container);
    border-radius: 16px;
    padding: 10px 14px;
}

.sa-avatar {
    border-radius: 999px;
    background-color: var(--primary_container);
    color: var(--on_primary_container);
    font-weight: 600;
}
.sa-avatar.sa-avatar-neutral {
    background-color: var(--surface_container_high);
    color: var(--primary);
}

.sa-chip-label { font-size: 0.85rem; font-weight: 500; }

.sa-row-icon-badge {
    border-radius: 999px;
    background-color: var(--surface_container_high);
}
.sa-row-icon-badge.sa-tier-primary { background-color: var(--primary); }
.sa-row-icon-badge.sa-tier-primary image { color: var(--on_primary); }
.sa-row-icon-badge.sa-tier-secondary image { color: var(--secondary); }
.sa-row-icon-badge.sa-tier-error image { color: var(--error); }

.sa-pill-btn {
    border-radius: 999px;
    padding: 10px 16px;
    background-color: var(--surface_container);
    color: var(--on_surface);
    border: none;
    box-shadow: none;
    min-height: 40px;
}
.sa-pill-btn:hover { background-color: var(--surface_container_high); }
.sa-pill-btn:focus { box-shadow: 0 0 0 2px var(--outline); }
.sa-pill-label { font-weight: 500; font-size: 0.92rem; }

.sa-pill-btn.sa-tier-primary {
    background-color: alpha(var(--primary_container), 0.35);
    color: var(--primary);
}
.sa-pill-btn.sa-tier-primary:hover { background-color: alpha(var(--primary_container), 0.5); }
.sa-pill-btn.sa-tier-primary:focus { box-shadow: 0 0 0 2px var(--primary); }

.sa-pill-btn.sa-tier-secondary {
    background-color: alpha(var(--secondary_container), 0.35);
    color: var(--secondary);
}
.sa-pill-btn.sa-tier-secondary:hover { background-color: alpha(var(--secondary_container), 0.5); }
.sa-pill-btn.sa-tier-secondary:focus { box-shadow: 0 0 0 2px var(--secondary); }

.sa-pill-btn.sa-tier-error {
    background-color: alpha(var(--error_container), 0.3);
    color: var(--error);
}
.sa-pill-btn.sa-tier-error:hover { background-color: alpha(var(--error_container), 0.45); }
.sa-pill-btn.sa-tier-error:focus { box-shadow: 0 0 0 2px var(--error); }

/* ---- circular buttons (quickshell / dock / circles / radial / pill / banner) ---- */
.sa-circle-btn {
    border-radius: 999px;
    background-color: var(--surface_container);
    border: none;
    box-shadow: none;
}
.sa-circle-btn:focus { box-shadow: 0 0 0 2px var(--outline); }
.sa-circle-label {
    font-size: 0.68rem;
    letter-spacing: 0.05em;
    color: var(--on_surface_variant);
}

.sa-circle-btn.sa-squircle { border-radius: 14px; }

.sa-circle-btn.sa-circle-hero {
    transition: all 0.15s ease;
}
.sa-circle-btn.sa-circle-hero:focus { transform: scale(1.2); }

.sa-circle-btn.sa-tier-primary { background-color: var(--primary_container); }
.sa-circle-btn.sa-tier-primary image { color: var(--on_primary_container); }
.sa-circle-btn.sa-tier-primary:focus { box-shadow: 0 0 0 2px var(--primary); }

.sa-circle-btn.sa-tier-secondary { background-color: var(--secondary_container); }
.sa-circle-btn.sa-tier-secondary image { color: var(--on_secondary_container); }
.sa-circle-btn.sa-tier-secondary:focus { box-shadow: 0 0 0 2px var(--secondary); }

.sa-circle-btn.sa-tier-error image { color: var(--error); }
.sa-circle-btn.sa-tier-error:focus { box-shadow: 0 0 0 2px var(--error); }

/* used by the radial hub / quickshell-style "primary tap target" look */
.sa-circle-btn.sa-filled { background-color: var(--primary_container); }
.sa-circle-btn.sa-filled image { color: var(--on_primary_container); }

/* ---- square tiles (grid / wlogout / bento) ---- */
.sa-tile-btn {
    border-radius: 4px;
    background-color: var(--surface_container);
    border: none;
    box-shadow: none;
    border-top: 3px solid transparent;
}
.sa-tile-btn:focus { border-top: 3px solid var(--outline); }
.sa-tile-badge {
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--on_surface_variant);
}

.sa-tile-btn.sa-sharp {
    border-radius: 0;
    transition: transform 0.15s ease;
}
.sa-tile-btn.sa-sharp:focus { transform: scale(1.08); }

.sa-tile-btn.sa-tier-primary:focus { border-top: 3px solid var(--primary); }
.sa-tile-btn.sa-tier-primary image, .sa-tile-btn.sa-tier-primary .sa-tile-label { color: var(--primary); }

.sa-tile-btn.sa-round { border-radius: 24px; }

.sa-tile-btn.sa-tier-secondary image, .sa-tile-btn.sa-tier-secondary .sa-tile-label { color: var(--secondary); }

.sa-tile-btn.sa-tier-error image, .sa-tile-btn.sa-tier-error .sa-tile-label { color: var(--error); }
.sa-tile-btn.sa-tier-error:focus { border-top: 3px solid var(--error); }

.sa-tile-btn.sa-hero {
    background-color: alpha(var(--primary_container), 0.4);
}

/* ---- rofi list ---- */
.sa-rofi-row { padding: 8px 12px; border-left: 3px solid transparent; }
.sa-rofi-row.sa-focused {
    background-color: var(--surface_container);
    border-left: 3px solid var(--primary);
}
.sa-rofi-row.sa-tier-primary label { color: var(--primary); }
.sa-rofi-row.sa-tier-secondary label { color: var(--on_surface_variant); }
.sa-rofi-row.sa-tier-error label, .sa-rofi-row.sa-tier-error .sa-rofi-key { color: var(--error); }
.sa-rofi-key {
    min-width: 24px;
    padding: 0 4px;
    border: 1px solid var(--outline_variant);
    font-size: 0.72rem;
    font-weight: 700;
}
.sa-bar { padding: 6px 12px; font-size: 0.78rem; color: var(--on_surface_variant); }
.sa-bar-top { border-bottom: 1px solid var(--outline_variant); }
.sa-bar-bottom { border-top: 1px solid var(--outline_variant); }

/* ---- TUI / whiptail ---- */
.sa-tui-selected { background-color: var(--primary); }
.sa-tui-selected label { color: var(--on_primary); }

/* ---- misc ---- */
.sa-heading-lg {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--on_surface_variant);
}

.sa-heading {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--on_surface_variant);
}
.sa-danger-text { color: var(--error); }
.sa-muted { font-size: 0.72rem; color: var(--on_surface_variant); }
.sa-dot { border-radius: 999px; background-color: var(--outline_variant); }
.sa-dot-filled { background-color: var(--error); }
"""


# --------------------------------------------------------------------------
# Base window: shared engine (actions, confirm, run, clock, key handling).
# Style subclasses only need to implement build_content() and, optionally,
# on_tick() to refresh any clock/uptime labels they created.
# --------------------------------------------------------------------------

class BaseWindow(Gtk.Window):
    DECORATED = True
    DEFAULT_WIDTH = 420

    def __init__(self, app):
        super().__init__(application=app)
        self.set_title("System Actions")
        self.set_resizable(False)
        self.set_modal(True)
        self.set_decorated(self.DECORATED)
        self.set_default_size(self.DEFAULT_WIDTH, -1)

        self.session, self.power = get_actions()
        self.all_actions = self.session + self.power
        self._key_map = {a["key"]: a for a in self.all_actions}
        self._nav_widgets = []  # populated by build_pill_row/build_circle/build_tile

        self.set_child(self.build_content())

        key_ctl = Gtk.EventControllerKey()
        key_ctl.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        key_ctl.connect("key-pressed", self.on_key)
        self.add_controller(key_ctl)

        GLib.idle_add(self._grab_initial_focus)

        self._tick()
        GLib.timeout_add_seconds(1, self._tick)

    def _grab_initial_focus(self):
        if self._nav_widgets:
            self._nav_widgets[0].grab_focus()
        return False

    def register_nav(self, widget):
        self._nav_widgets.append(widget)
        return widget

    def move_nav(self, delta):
        if not self._nav_widgets:
            return
        focused = self.get_focus()
        idx = self._nav_widgets.index(focused) if focused in self._nav_widgets else 0
        idx = (idx + delta) % len(self._nav_widgets)
        self._nav_widgets[idx].grab_focus()

    # ---- to override ----

    def build_content(self):
        raise NotImplementedError

    def on_tick(self, now, uptime_str):
        pass

    # ---- shared helpers ----

    def _tick(self):
        self.on_tick(datetime.now(), get_uptime())
        return True

    def make_icon(self, icon_name, size=18):
        img = Gtk.Image.new_from_icon_name(icon_name)
        img.set_pixel_size(size)
        return img

    def display_name(self):
        return getpass.getuser()

    def hostline(self):
        return f"{getpass.getuser()}@{socket.gethostname()}"

    def on_key(self, _ctl, keyval, _keycode, state):
        if keyval == Gdk.KEY_Escape:
            self.close()
            return True
        if keyval in (Gdk.KEY_Left, Gdk.KEY_Up):
            self.move_nav(-1)
            return True
        if keyval in (Gdk.KEY_Right, Gdk.KEY_Down):
            self.move_nav(1)
            return True
        try:
            ch = chr(Gdk.keyval_to_unicode(keyval)).lower()
        except (ValueError, OverflowError):
            ch = ""
        if ch in self._key_map:
            self.trigger(self._key_map[ch])
            return True
        return False

    def trigger(self, action):
        if action.get("destructive"):
            self.confirm_then_run(action)
        else:
            self.run_cmd(action["cmd"])

    def confirm_then_run(self, action):
        dialog = Adw.MessageDialog(
            transient_for=self,
            heading=f"{action['label']}?",
            body=f"This will {action['label'].lower()} the machine now. "
                 f"Any unsaved work will be lost.",
        )
        dialog.add_response("cancel", "Cancel")
        dialog.add_response("confirm", action["label"])
        dialog.set_response_appearance("confirm", Adw.ResponseAppearance.DESTRUCTIVE)
        dialog.set_default_response("cancel")
        dialog.set_close_response("cancel")

        def on_response(_d, response):
            if response == "confirm":
                self.run_cmd(action["cmd"])

        dialog.connect("response", on_response)
        dialog.present()

    def run_cmd(self, cmd):
        def go():
            try:
                subprocess.run(cmd, check=True)
            except Exception as exc:
                self.show_error(cmd, exc)
                return
            self.close()
        GLib.timeout_add(150, go)

    def show_error(self, cmd, exc):
        dialog = Adw.MessageDialog(
            transient_for=self,
            heading="Action failed",
            body=f"Couldn't run '{' '.join(cmd)}':\n{exc}",
        )
        dialog.add_response("ok", "OK")
        dialog.present()

    # ---- reusable widget builders ----

    def action_tier(self, action):
        if action.get("destructive"):
            return "sa-tier-error"
        if action.get("id") == "lock":
            return "sa-tier-primary"
        return "sa-tier-secondary"

    def build_text_row(self, action, focused=False):
        content = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        content.append(self.make_icon(action["icon"], 15))
        lbl = Gtk.Label(label=action["label"])
        lbl.set_xalign(0)
        content.append(lbl)

        btn = Gtk.Button()
        btn.set_child(content)
        btn.add_css_class("sa-text-row")
        btn.add_css_class(self.action_tier(action))
        if focused:
            btn.add_css_class("sa-focused")
        btn.connect("clicked", lambda *_a, act=action: self.trigger(act))
        return self.register_nav(btn)

    def build_chip(self, action, focused=False, min_w=110, min_h=54, icon_size=18):
        content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        content.set_halign(Gtk.Align.CENTER)
        content.set_valign(Gtk.Align.CENTER)
        content.append(self.make_icon(action["icon"], icon_size))
        lbl = Gtk.Label(label=action["label"])
        lbl.add_css_class("sa-chip-label")
        content.append(lbl)

        btn = Gtk.Button()
        btn.set_size_request(min_w, min_h)
        btn.add_css_class("sa-pill-btn")
        btn.add_css_class(self.action_tier(action))
        if focused:
            btn.add_css_class("sa-focused")
        btn.set_child(content)
        btn.connect("clicked", lambda *_a, act=action: self.trigger(act))
        return self.register_nav(btn)

    def build_avatar(self, size=44, font_class="title-3", tonal=True):
        avatar = Gtk.Box()
        avatar.set_size_request(size, size)
        avatar.add_css_class("sa-avatar")
        if not tonal:
            avatar.add_css_class("sa-avatar-neutral")
        avatar.set_halign(Gtk.Align.CENTER)
        avatar.set_valign(Gtk.Align.CENTER)
        avatar.set_overflow(Gtk.Overflow.HIDDEN)

        image_path = self._avatar_image_path()
        if image_path:
            img = Gtk.Image.new_from_file(image_path)
            img.set_pixel_size(size)
            avatar.append(img)
        else:
            initials = Gtk.Label(label=self.display_name()[:2].upper())
            if font_class:
                initials.add_css_class(font_class)
            avatar.append(initials)
        return avatar

    def _avatar_image_path(self):
        user = getpass.getuser()
        for p in (f"/var/lib/AccountsService/icons/{user}", os.path.expanduser("~/.face")):
            if os.path.exists(p):
                return p
        return None

    def build_pill_row(self, action, focused=False):
        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)

        icon_badge = Gtk.Box()
        icon_badge.set_size_request(32, 32)
        icon_badge.add_css_class("sa-row-icon-badge")
        icon_badge.add_css_class(self.action_tier(action))
        icon_badge.set_halign(Gtk.Align.CENTER)
        icon_badge.set_valign(Gtk.Align.CENTER)
        icon_badge.append(self.make_icon(action["icon"], 16))
        row.append(icon_badge)

        label = Gtk.Label(label=action["label"])
        label.add_css_class("sa-pill-label")
        label.set_xalign(0)
        row.append(label)

        btn = Gtk.Button()
        btn.set_child(row)
        btn.add_css_class("sa-pill-btn")
        btn.add_css_class(self.action_tier(action))
        if focused:
            btn.add_css_class("sa-focused")
        btn.connect("clicked", lambda *_a, act=action: self.trigger(act))
        return self.register_nav(btn)

    def build_circle(self, action, focused=False, size=56, icon_size=20):
        btn = Gtk.Button()
        btn.set_size_request(size, size)
        btn.add_css_class("sa-circle-btn")
        btn.add_css_class(self.action_tier(action))
        if focused:
            btn.add_css_class("sa-focused")
        btn.set_child(self.make_icon(action["icon"], icon_size))
        btn.connect("clicked", lambda *_a, act=action: self.trigger(act))
        return self.register_nav(btn)

    def build_circle_with_label(self, action, focused=False, size=56):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        box.set_halign(Gtk.Align.CENTER)
        box.append(self.build_circle(action, focused=focused, size=size))
        lbl = Gtk.Label(label=action["label"].upper())
        lbl.add_css_class("sa-circle-label")
        box.append(lbl)
        return box

    def build_tile(self, action, focused=False, badge=None, w=90, h=90, icon_size=26):
        content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        content.set_halign(Gtk.Align.CENTER)
        content.set_valign(Gtk.Align.CENTER)
        content.append(self.make_icon(action["icon"], icon_size))
        lbl = Gtk.Label(label=action["label"])
        lbl.add_css_class("sa-tile-label")
        lbl.set_wrap(True)
        content.append(lbl)

        overlay = Gtk.Overlay()
        overlay.set_child(content)
        if badge is not None:
            badge_lbl = Gtk.Label(label=str(badge))
            badge_lbl.add_css_class("sa-tile-badge")
            badge_lbl.set_halign(Gtk.Align.START)
            badge_lbl.set_valign(Gtk.Align.START)
            badge_lbl.set_margin_start(6)
            badge_lbl.set_margin_top(4)
            overlay.add_overlay(badge_lbl)

        btn = Gtk.Button()
        btn.set_size_request(w, h)
        btn.add_css_class("sa-tile-btn")
        btn.add_css_class(self.action_tier(action))
        if focused:
            btn.add_css_class("sa-focused")
        btn.set_child(overlay)
        btn.connect("clicked", lambda *_a, act=action: self.trigger(act))
        return self.register_nav(btn)

    def vertical_label(self, text):
        """GtkLabel has no rotation API in GTK4, so fake sideways text by
        stacking one letter per row instead."""
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=1)
        box.set_halign(Gtk.Align.CENTER)
        for ch in text:
            if ch == " ":
                continue
            lbl = Gtk.Label(label=ch)
            lbl.add_css_class("sa-heading-lg")
            box.append(lbl)
        return box

    def build_cancel_pill(self):
        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        row.append(self.make_icon("window-close-symbolic", 18))
        label = Gtk.Label(label="Cancel")
        label.add_css_class("sa-pill-label")
        label.set_xalign(0)
        row.append(label)
        btn = Gtk.Button()
        btn.set_child(row)
        btn.add_css_class("sa-pill-btn")
        btn.connect("clicked", lambda *_: self.close())
        return self.register_nav(btn)

    def build_cancel_circle(self, size=56, icon_size=20):
        btn = Gtk.Button()
        btn.set_size_request(size, size)
        btn.add_css_class("sa-circle-btn")
        btn.set_child(self.make_icon("window-close-symbolic", icon_size))
        btn.connect("clicked", lambda *_: self.close())
        return self.register_nav(btn)

    def build_cancel_circle_with_label(self, size=56):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        box.set_halign(Gtk.Align.CENTER)
        box.append(self.build_cancel_circle(size=size))
        lbl = Gtk.Label(label="CANCEL")
        lbl.add_css_class("sa-circle-label")
        box.append(lbl)
        return box

    def build_cancel_tile(self, w=90, h=90, icon_size=26, badge=None):
        content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        content.set_halign(Gtk.Align.CENTER)
        content.set_valign(Gtk.Align.CENTER)
        content.append(self.make_icon("window-close-symbolic", icon_size))
        content.append(Gtk.Label(label="Cancel"))
        overlay = Gtk.Overlay()
        overlay.set_child(content)
        if badge is not None:
            badge_lbl = Gtk.Label(label=str(badge))
            badge_lbl.add_css_class("sa-tile-badge")
            badge_lbl.set_halign(Gtk.Align.START)
            badge_lbl.set_valign(Gtk.Align.START)
            badge_lbl.set_margin_start(6)
            badge_lbl.set_margin_top(4)
            overlay.add_overlay(badge_lbl)
        btn = Gtk.Button()
        btn.set_size_request(w, h)
        btn.add_css_class("sa-tile-btn")
        btn.set_child(overlay)
        btn.connect("clicked", lambda *_: self.close())
        return self.register_nav(btn)

    def wrap_panel(self, child, flat=False):
        child.add_css_class("sa-panel-flat" if flat else "sa-panel")
        return child


# --------------------------------------------------------------------------
# 1. card — header card, SESSION/POWER sections, tonal pill buttons
# --------------------------------------------------------------------------

class CardWindow(BaseWindow):
    DECORATED = True

    def build_content(self):
        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        root.set_margin_top(20)
        root.set_margin_bottom(16)
        root.set_margin_start(20)
        root.set_margin_end(20)

        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        header.add_css_class("sa-header-pill")
        header.append(self.build_avatar(size=44))

        info = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=1)
        info.set_hexpand(True)
        info.set_valign(Gtk.Align.CENTER)
        name_lbl = Gtk.Label(label=self.display_name())
        name_lbl.set_xalign(0)
        self.meta_label = Gtk.Label()
        self.meta_label.add_css_class("sa-muted")
        self.meta_label.set_xalign(0)
        info.append(name_lbl)
        info.append(self.meta_label)
        header.append(info)

        clock_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        clock_box.set_valign(Gtk.Align.CENTER)
        self.clock_label = Gtk.Label()
        self.clock_label.set_xalign(1)
        self.date_label = Gtk.Label()
        self.date_label.add_css_class("sa-muted")
        self.date_label.set_xalign(1)
        clock_box.append(self.clock_label)
        clock_box.append(self.date_label)
        header.append(clock_box)
        root.append(header)

        title = Gtk.Label(label="System actions")
        title.add_css_class("title-2")
        root.append(title)

        if self.session:
            root.append(self._section("SESSION", self.session))
        if self.power:
            root.append(self._section("POWER", self.power))
        return root

    def _section(self, title, actions):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        heading = Gtk.Label(label=title)
        heading.add_css_class("sa-heading")
        heading.set_xalign(0.5)
        box.append(heading)
        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10, halign=Gtk.Align.CENTER)
        for a in actions:
            row.append(self.build_chip(a))
        box.append(row)
        return box

    def on_tick(self, now, uptime_str):
        self.clock_label.set_text(now.strftime("%H:%M"))
        self.date_label.set_text(now.strftime("%a %d %b"))
        self.meta_label.set_text(f"{self.hostline()} \u00b7 up {uptime_str}")


# --------------------------------------------------------------------------
# 2. rofi — dmenu/rofi-style keyboard-first list
# --------------------------------------------------------------------------

class RofiWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 340

    def build_content(self):
        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        root.add_css_class("sa-mono")
        root.add_css_class("sa-panel-flat")

        top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        top.add_css_class("sa-bar")
        top.add_css_class("sa-bar-top")
        left = Gtk.Label(label=self.hostline())
        left.set_hexpand(True)
        left.set_xalign(0)
        self.clock_label = Gtk.Label()
        self.clock_label.set_xalign(1)
        top.append(left)
        top.append(self.clock_label)
        root.append(top)

        prompt = Gtk.Label(label="SYSTEM ACTIONS")
        prompt.add_css_class("sa-heading")
        prompt.set_xalign(0)
        prompt.set_margin_top(8)
        prompt.set_margin_start(12)
        root.append(prompt)

        self.listbox = Gtk.ListBox()
        self.listbox.set_selection_mode(Gtk.SelectionMode.BROWSE)
        self.listbox.connect("row-activated", lambda _lb, row: self.trigger(row.action))
        self._rows = []
        for a in self.all_actions:
            row = self._make_row(a)
            row.action = a
            self.listbox.append(row)
            self._rows.append(row)
        root.append(self.listbox)
        if self._rows:
            self.listbox.select_row(self._rows[0])

        hint = Gtk.Label(label="\u2191\u2193/jk move   enter select   letter jump   esc quit")
        hint.add_css_class("sa-muted")
        hint.set_xalign(0)
        hint.set_margin_start(12)
        hint.set_margin_bottom(6)
        root.append(hint)

        bottom = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        bottom.add_css_class("sa-bar")
        bottom.add_css_class("sa-bar-bottom")
        self.date_label = Gtk.Label()
        self.date_label.set_hexpand(True)
        self.date_label.set_xalign(0)
        self.uptime_label = Gtk.Label()
        self.uptime_label.set_xalign(1)
        bottom.append(self.date_label)
        bottom.append(self.uptime_label)
        root.append(bottom)
        return root

    def _make_row(self, action):
        row = Gtk.ListBoxRow()
        row.add_css_class("sa-rofi-row")
        if action is not None:
            row.add_css_class(self.action_tier(action))
        content = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        key = "esc" if action is None else action["key"]
        label = "Cancel" if action is None else action["label"]
        key_badge = Gtk.Label(label=key.upper())
        key_badge.add_css_class("sa-rofi-key")
        content.append(key_badge)
        content.append(Gtk.Label(label=label))
        row.set_child(content)
        return row

    def _grab_initial_focus(self):
        if self._rows:
            self.listbox.grab_focus()
        return False

    def on_key(self, ctl, keyval, keycode, state):
        if keyval in (Gdk.KEY_j, Gdk.KEY_Down):
            self._move(1)
            return True
        if keyval in (Gdk.KEY_k, Gdk.KEY_Up):
            self._move(-1)
            return True
        if keyval in (Gdk.KEY_Return, Gdk.KEY_KP_Enter):
            row = self.listbox.get_selected_row()
            if row is not None:
                self.trigger(row.action)
            return True
        return super().on_key(ctl, keyval, keycode, state)

    def _move(self, delta):
        row = self.listbox.get_selected_row()
        idx = self._rows.index(row) if row in self._rows else 0
        idx = (idx + delta) % len(self._rows)
        self.listbox.select_row(self._rows[idx])

    def trigger(self, action):
        if action is None:
            self.close()
            return
        super().trigger(action)

    def on_tick(self, now, uptime_str):
        self.clock_label.set_text(now.strftime("%H:%M:%S"))
        self.date_label.set_text(now.strftime("%a %d %b"))
        self.uptime_label.set_text(f"up {uptime_str}")


# --------------------------------------------------------------------------
# 3. quickshell — big clock + circular icon dock, split panel
# --------------------------------------------------------------------------

class QuickshellWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = -1

    def build_content(self):
        outer = Gtk.Box()
        outer.add_css_class("sa-panel")

        root = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=28)

        left = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        self.clock_label = Gtk.Label()
        self.clock_label.add_css_class("title-1")
        self.clock_label.set_xalign(0)
        self.date_label = Gtk.Label()
        self.date_label.add_css_class("sa-muted")
        self.date_label.set_xalign(0)
        left.append(self.clock_label)
        left.append(self.date_label)

        self.meta_label = Gtk.Label()
        self.meta_label.add_css_class("sa-muted")
        self.meta_label.set_xalign(0)
        self.meta_label.set_margin_top(14)
        left.append(self.meta_label)

        icons = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        row = None
        for i, a in enumerate(self.all_actions):
            if i % 3 == 0:
                row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
                row.set_halign(Gtk.Align.CENTER)
                icons.append(row)
            row.append(self.build_circle_with_label(a, focused=(i == 0), size=60))

        root.append(left)
        root.append(icons)
        outer.append(root)
        return outer

    def on_tick(self, now, uptime_str):
        self.clock_label.set_text(now.strftime("%H:%M"))
        self.date_label.set_text(now.strftime("%A, %d %b"))
        self.meta_label.set_text(f"{self.hostline()}\nup {uptime_str}")


# --------------------------------------------------------------------------
# 4. grid — rofi grid theme, numbered icon tiles
# --------------------------------------------------------------------------

class GridWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 480

    def build_content(self):
        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        root.add_css_class("sa-mono")
        root.add_css_class("sa-panel-flat")

        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        header.add_css_class("sa-bar")
        header.add_css_class("sa-bar-top")
        left = Gtk.Label(label=f"power > {self.hostline()}")
        left.set_hexpand(True)
        left.set_xalign(0)
        right = Gtk.Label(label=f"{len(self.all_actions)} items")
        right.add_css_class("sa-muted")
        header.append(left)
        header.append(right)
        root.append(header)

        grid = Gtk.Grid()
        grid.add_css_class("sa-grid-seam")
        grid.set_column_homogeneous(True)
        grid.set_column_spacing(1)
        for i, a in enumerate(self.all_actions):
            grid.attach(self.build_tile(a, focused=(i == 0), badge=i + 1, w=88, h=96), i, 0, 1, 1)
        grid.set_margin_top(4)
        root.append(grid)

        footer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        footer.add_css_class("sa-bar")
        footer.add_css_class("sa-bar-bottom")
        hint = Gtk.Label(label="1-5 select   enter confirm   esc quit")
        hint.set_hexpand(True)
        hint.set_xalign(0)
        self.uptime_label = Gtk.Label()
        self.uptime_label.set_xalign(1)
        footer.append(hint)
        footer.append(self.uptime_label)
        root.append(footer)
        return root

    def on_key(self, ctl, keyval, keycode, state):
        if Gdk.KEY_1 <= keyval <= Gdk.KEY_9:
            idx = keyval - Gdk.KEY_1
            if idx < len(self.all_actions):
                self.trigger(self.all_actions[idx])
            return True
        return super().on_key(ctl, keyval, keycode, state)

    def on_tick(self, now, uptime_str):
        self.uptime_label.set_text(f"up {uptime_str}")


# --------------------------------------------------------------------------
# 5. radial — icons arranged on a circle around a clock hub
# --------------------------------------------------------------------------

class RadialWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 340

    def build_content(self):
        size = 320
        fixed = Gtk.Fixed()
        fixed.set_size_request(size, size)
        cx = cy = size / 2
        r = 118

        guide = Gtk.Box()
        guide.add_css_class("sa-guide-circle")
        guide.set_size_request(int(r * 2), int(r * 2))
        fixed.put(guide, cx - r, cy - r)

        hub = Gtk.Button()
        hub.add_css_class("sa-circle-btn")
        hub.set_size_request(110, 110)
        hub_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        hub_box.set_halign(Gtk.Align.CENTER)
        hub_box.set_valign(Gtk.Align.CENTER)
        self.clock_label = Gtk.Label()
        self.clock_label.add_css_class("title-3")
        cancel_hint = Gtk.Label(label="TAP TO CANCEL")
        cancel_hint.add_css_class("sa-muted")
        hub_box.append(self.clock_label)
        hub_box.append(cancel_hint)
        hub.set_child(hub_box)
        hub.connect("clicked", lambda *_: self.close())
        self.register_nav(hub)
        fixed.put(hub, cx - 55, cy - 55)

        n = max(1, len(self.all_actions))
        for i, a in enumerate(self.all_actions):
            angle = (2 * math.pi * i / n) - math.pi / 2
            x = cx + r * math.cos(angle) - 30
            y = cy + r * math.sin(angle) - 30
            widget = self.build_circle_with_label(a, focused=(i == 0))
            fixed.put(widget, x, y - 12)

        return self.wrap_panel(fixed)

    def on_tick(self, now, uptime_str):
        self.clock_label.set_text(now.strftime("%H:%M"))


# --------------------------------------------------------------------------
# 6. bento — asymmetric importance-weighted dashboard tiles
# --------------------------------------------------------------------------

class BentoWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = -1

    def build_content(self):
        grid = Gtk.Grid()
        grid.add_css_class("sa-panel-flat")
        grid.add_css_class("sa-grid-seam")
        grid.set_row_spacing(1)
        grid.set_column_spacing(1)
        grid.set_margin_top(6)
        grid.set_margin_bottom(6)
        grid.set_margin_start(6)
        grid.set_margin_end(6)

        side_box = self.vertical_label("SYSTEM")
        side_box.set_size_request(36, -1)
        grid.attach(side_box, 0, 0, 1, 3)

        actions_by_id = {a["id"]: a for a in self.all_actions}
        hero = actions_by_id.get("lock")
        if hero:
            hero_tile = self.build_tile(hero, focused=True, w=180, h=-1, icon_size=30)
            hero_tile.add_css_class("sa-hero")
            grid.attach(hero_tile, 1, 0, 2, 2)

        self.clock_label = Gtk.Label()
        self.clock_label.add_css_class("title-3")
        clock_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        clock_box.set_valign(Gtk.Align.CENTER)
        clock_box.set_margin_start(12)
        clock_box.set_margin_end(12)
        clock_box.append(self.clock_label)
        self.date_label = Gtk.Label()
        self.date_label.add_css_class("sa-muted")
        clock_box.append(self.date_label)
        grid.attach(clock_box, 3, 0, 1, 1)

        rest = [a for a in self.all_actions if a["id"] != "lock"]
        col = 3
        for a in rest[:1]:
            grid.attach(self.build_tile(a, w=96, h=76, icon_size=22), col, 1, 1, 1)
            col += 1
        col2 = 1
        for a in rest[1:]:
            grid.attach(self.build_tile(a, w=96, h=76, icon_size=22), col2, 2, 1, 1)
            col2 += 1

        return grid

    def on_tick(self, now, uptime_str):
        self.clock_label.set_text(now.strftime("%H:%M"))
        self.date_label.set_text(now.strftime("%a %d"))


# --------------------------------------------------------------------------
# 7. tui — whiptail/dialog box-drawing popup, reverse-video selection
# --------------------------------------------------------------------------

class TuiWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 400

    def build_content(self):
        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        root.add_css_class("sa-mono")
        root.add_css_class("sa-panel-flat")
        root.set_margin_top(4)
        root.set_margin_bottom(4)

        WIDTH = 42
        top = Gtk.Label(label="\u250c" + "\u2500" * WIDTH + "\u2510")
        top.set_xalign(0)
        root.append(top)

        title = Gtk.Label(label=f"\u2502 system actions \u2500\u2500 {self.hostline()}".ljust(WIDTH + 1) + "\u2502")
        title.set_xalign(0)
        root.append(title)

        blank = Gtk.Label(label="\u2502" + " " * WIDTH + "\u2502")
        blank.set_xalign(0)
        root.append(blank)

        self._tui_entries = []  # (label_widget, action)
        for i, a in enumerate(self.all_actions):
            row = self._tui_row(a["key"], a["label"], a.get("destructive"), focused=(i == 0))
            root.append(row)
            self._tui_entries.append((row, a))
        self._tui_index = 0

        blank2 = Gtk.Label(label="\u2502" + " " * WIDTH + "\u2502")
        blank2.set_xalign(0)
        root.append(blank2)

        mid = Gtk.Label(label="\u251c" + "\u2500" * WIDTH + "\u2524")
        mid.set_xalign(0)
        root.append(mid)

        self.status_label = Gtk.Label()
        self.status_label.set_xalign(0)
        root.append(self.status_label)

        bottom = Gtk.Label(label="\u2514" + "\u2500" * WIDTH + "\u2518")
        bottom.set_xalign(0)
        root.append(bottom)
        return root

    def _tui_row(self, key, label, destructive, focused):
        text = f" > [{key}] {label}" if focused else f"   [{key}] {label}"
        text = ("\u2502" + text).ljust(43) + "\u2502"
        row = Gtk.Label(label=text)
        row.set_xalign(0)
        if focused:
            row.add_css_class("sa-tui-selected")
        elif destructive:
            row.add_css_class("sa-danger-text")
        return row

    def on_tick(self, now, uptime_str):
        text = f"\u2502 {now.strftime('%H:%M:%S')}  \u00b7  up {uptime_str}".ljust(43) + "\u2502"
        self.status_label.set_text(text)

    def _select_tui(self, idx):
        idx = idx % len(self._tui_entries)
        old_row, _ = self._tui_entries[self._tui_index]
        old_row.remove_css_class("sa-tui-selected")
        self._tui_index = idx
        new_row, _ = self._tui_entries[idx]
        new_row.add_css_class("sa-tui-selected")

    def on_key(self, ctl, keyval, keycode, state):
        if keyval in (Gdk.KEY_Up, Gdk.KEY_Left):
            self._select_tui(self._tui_index - 1)
            return True
        if keyval in (Gdk.KEY_Down, Gdk.KEY_Right):
            self._select_tui(self._tui_index + 1)
            return True
        if keyval in (Gdk.KEY_Return, Gdk.KEY_KP_Enter):
            _row, action = self._tui_entries[self._tui_index]
            if action is None:
                self.close()
            else:
                self.trigger(action)
            return True
        return super().on_key(ctl, keyval, keycode, state)


# --------------------------------------------------------------------------
# 8. dock — wayland edge-anchored vertical icon dock
# --------------------------------------------------------------------------

class DockWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 100

    def build_content(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        box.add_css_class("sa-panel")
        for i, a in enumerate(self.session):
            btn = self.build_circle(a, focused=(i == 0), size=44)
            btn.add_css_class("sa-squircle")
            btn.set_tooltip_text(a["label"])
            box.append(btn)
        if self.session and self.power:
            box.append(Gtk.Separator())
        for a in self.power:
            btn = self.build_circle(a, size=44)
            btn.add_css_class("sa-squircle")
            btn.set_tooltip_text(a["label"])
            box.append(btn)
        return box


# --------------------------------------------------------------------------
# 9. wlogout — flat square tile row, colored top border on focus
# --------------------------------------------------------------------------

class WlogoutWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 560

    def build_content(self):
        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        row.set_halign(Gtk.Align.CENTER)
        row.set_margin_top(20)
        row.set_margin_bottom(20)
        for i, a in enumerate(self.all_actions):
            tile = self.build_tile(a, focused=(i == 0), w=96, h=96, icon_size=28)
            tile.add_css_class("sa-sharp")
            row.append(tile)
        return row


# --------------------------------------------------------------------------
# 10. dots — swaylock dot-ring hold-to-confirm gesture
# --------------------------------------------------------------------------

class DotsWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 320

    HOLD_MS = 1400
    TICK_MS = 70
    DOTS = 28

    def build_content(self):
        self._destructive = [a for a in self.all_actions if a.get("destructive")]
        self._target_idx = 0

        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        outer.add_css_class("sa-panel")

        quick_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10, halign=Gtk.Align.CENTER)
        for a in self.all_actions:
            if not a.get("destructive"):
                quick_row.append(self.build_circle(a, size=44, icon_size=16))
        outer.append(quick_row)

        if not self._destructive:
            note = Gtk.Label(label="No power actions available (systemctl not found).")
            note.add_css_class("sa-muted")
            outer.append(note)
            return outer

        self.fixed = Gtk.Fixed()
        self.fixed.set_size_request(220, 220)
        self._dots = []
        cx = cy = 110
        r = 95
        for i in range(self.DOTS):
            angle = (2 * math.pi * i / self.DOTS) - math.pi / 2
            x = cx + r * math.cos(angle) - 4
            y = cy + r * math.sin(angle) - 4
            dot = Gtk.Box()
            dot.add_css_class("sa-dot")
            dot.set_size_request(8, 8)
            self.fixed.put(dot, x, y)
            self._dots.append(dot)

        self.center_btn = Gtk.Button()
        self.center_btn.add_css_class("sa-circle-btn")
        self.center_btn.add_css_class("sa-tier-error")
        self.center_btn.set_size_request(80, 80)
        self.center_btn.set_child(self.make_icon(self._destructive[0]["icon"], 26))
        self.register_nav(self.center_btn)
        self.fixed.put(self.center_btn, 70, 70)
        outer.append(self.fixed)

        self.status_label = Gtk.Label(label=f"hold to {self._destructive[0]['label'].lower()}")
        self.status_label.add_css_class("sa-danger-text")
        self.hint_label = Gtk.Label(label="release early to cancel   \u00b7   tap icon to switch action")
        self.hint_label.add_css_class("sa-muted")
        outer.append(self.status_label)
        outer.append(self.hint_label)

        self._progress = 0
        self._hold_source = None

        # tap-and-quick-release cycles which destructive action is armed;
        # holding past the threshold fills the ring and triggers the action
        click = Gtk.GestureClick()
        click.connect("pressed", self._on_press)
        click.connect("released", self._on_release)
        self.center_btn.add_controller(click)

        return outer

    def _on_press(self, _gesture, _n, _x, _y):
        self._progress = 0
        self._reset_dots()
        self._hold_source = GLib.timeout_add(self.TICK_MS, self._on_tick_hold)

    def _on_release(self, _gesture, _n, _x, _y):
        if self._progress * (self.TICK_MS / self.HOLD_MS) < 0.35:
            # short tap: cycle armed action instead of holding
            self._target_idx = (self._target_idx + 1) % len(self._destructive)
            action = self._destructive[self._target_idx]
            self.center_btn.set_child(self.make_icon(action["icon"], 26))
            self.status_label.set_text(f"hold to {action['label'].lower()}")
        if self._hold_source is not None:
            GLib.source_remove(self._hold_source)
            self._hold_source = None
        self._progress = 0
        self._reset_dots()

    def _on_tick_hold(self):
        self._progress += 1
        filled = min(self.DOTS, int(self.DOTS * (self._progress * self.TICK_MS) / self.HOLD_MS))
        for i, dot in enumerate(self._dots):
            if i < filled:
                dot.add_css_class("sa-dot-filled")
            else:
                dot.remove_css_class("sa-dot-filled")
        if filled >= self.DOTS:
            self._hold_source = None
            self.trigger(self._destructive[self._target_idx])
            return False
        return True

    def _reset_dots(self):
        for dot in self._dots:
            dot.remove_css_class("sa-dot-filled")


# --------------------------------------------------------------------------
# 11. end4 — end-4/dots-hyprland style, heavily rounded pill rows
# --------------------------------------------------------------------------

class End4Window(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 320

    def build_content(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        box.add_css_class("sa-panel")

        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        header.add_css_class("sa-header-pill")
        header.append(self.build_avatar(size=36, font_class=None))
        name = Gtk.Label(label=self.display_name())
        name.set_hexpand(True)
        name.set_xalign(0)
        self.clock_label = Gtk.Label()
        header.append(name)
        header.append(self.clock_label)
        box.append(header)

        non_destructive = [a for a in self.all_actions if not a.get("destructive")]
        destructive = [a for a in self.all_actions if a.get("destructive")]

        for i, a in enumerate(non_destructive):
            box.append(self.build_pill_row(a, focused=(i == 0)))

        if destructive:
            row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
            for a in destructive:
                tile = self.build_tile(a, w=-1, h=80, icon_size=20)
                tile.add_css_class("sa-round")
                tile.set_hexpand(True)
                row.append(tile)
            box.append(row)
        return box

    def on_tick(self, now, uptime_str):
        self.clock_label.set_text(now.strftime("%H:%M"))


# --------------------------------------------------------------------------
# 12. circles — floating vertical circle stack, no card
# --------------------------------------------------------------------------

class CirclesWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 120

    def build_content(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        box.set_margin_top(20)
        box.set_margin_bottom(20)
        for a in self.all_actions:
            btn = self.build_circle(a, size=52, icon_size=18)
            btn.add_css_class("sa-circle-hero")
            box.append(btn)
        return box


# --------------------------------------------------------------------------
# 13. avatar — big avatar + text list menu
# --------------------------------------------------------------------------

class AvatarWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 360

    def build_content(self):
        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=0)
        row.add_css_class("sa-panel")

        row.append(self.build_avatar(size=120, font_class="title-1", tonal=False))

        menu = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        menu.set_margin_start(16)
        host = Gtk.Label(label=self.hostline())
        host.add_css_class("sa-muted")
        host.set_xalign(0)
        menu.append(host)
        for i, a in enumerate(self.all_actions):
            menu.append(self.build_text_row(a, focused=(i == 0)))
        row.append(menu)
        return row


# --------------------------------------------------------------------------
# 14. pill — compact status pill + icon row
# --------------------------------------------------------------------------

class PillWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 300

    def build_content(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        box.add_css_class("sa-panel")

        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        header.add_css_class("sa-pill-btn")
        header.set_halign(Gtk.Align.START)
        header.append(self.build_avatar(size=28, font_class=None))
        header.append(Gtk.Label(label=self.display_name()))
        box.append(header)

        self.uptime_label = Gtk.Label()
        self.uptime_label.add_css_class("sa-muted")
        self.uptime_label.set_xalign(0)
        box.append(self.uptime_label)

        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        for i, a in enumerate(self.all_actions):
            row.append(self.build_circle(a, focused=(i == 0), size=40, icon_size=16))
        box.append(row)
        return box

    def on_tick(self, now, uptime_str):
        self.uptime_label.set_text(f"uptime: {uptime_str}")


# --------------------------------------------------------------------------
# 15. banner — wallpaper banner + pill + icon row
# --------------------------------------------------------------------------

class BannerWindow(BaseWindow):
    DECORATED = False
    DEFAULT_WIDTH = 340

    def build_content(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        box.add_css_class("sa-panel-flat")

        wallpaper_path = os.path.expanduser("~/.config/background.jpg")
        if os.path.exists(wallpaper_path):
            banner_content = Gtk.Picture.new_for_filename(wallpaper_path)
            banner_content.set_content_fit(Gtk.ContentFit.COVER)
            banner_content.set_size_request(-1, 120)
        else:
            banner_content = Gtk.Box()
            banner_content.set_size_request(-1, 120)
            banner_content.set_valign(Gtk.Align.CENTER)
            banner_content.append(self.make_icon("image-x-generic-symbolic", 30))
            banner_content.set_halign(Gtk.Align.CENTER)

        badge = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        badge.add_css_class("sa-banner-badge")
        badge.append(self.build_avatar(size=18, font_class=None))
        badge.append(Gtk.Label(label=self.display_name()))
        badge.set_halign(Gtk.Align.START)
        badge.set_valign(Gtk.Align.START)
        badge.set_margin_start(10)
        badge.set_margin_top(10)

        banner = Gtk.Overlay()
        banner.set_child(banner_content)
        banner.add_overlay(badge)
        box.append(banner)

        footer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        footer.set_margin_start(14)
        footer.set_margin_end(14)
        footer.set_margin_top(8)
        footer.set_margin_bottom(14)

        self.uptime_label = Gtk.Label()
        self.uptime_label.add_css_class("sa-muted")
        self.uptime_label.set_xalign(0)
        footer.append(self.uptime_label)

        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        for i, a in enumerate(self.all_actions):
            row.append(self.build_circle(a, focused=(i == 0), size=36, icon_size=15))
        footer.append(row)
        box.append(footer)
        return box

    def on_tick(self, now, uptime_str):
        self.uptime_label.set_text(f"uptime: {uptime_str}")


# --------------------------------------------------------------------------
# CLI dispatch
# --------------------------------------------------------------------------

STYLES = {
    "card": CardWindow,
    "rofi": RofiWindow,
    "quickshell": QuickshellWindow,
    "grid": GridWindow,
    "radial": RadialWindow,
    "bento": BentoWindow,
    "tui": TuiWindow,
    "dock": DockWindow,
    "wlogout": WlogoutWindow,
    "dots": DotsWindow,
    "end4": End4Window,
    "circles": CirclesWindow,
    "avatar": AvatarWindow,
    "pill": PillWindow,
    "banner": BannerWindow,
}


class App(Adw.Application):
    def __init__(self, style):
        super().__init__(application_id="dev.sak.SystemActionsGallery")
        GLib.set_application_name("System Actions")
        self.style = style
        css = Gtk.CssProvider()
        css.load_from_string(CSS)
        self._css = css

    def do_startup(self):
        Adw.Application.do_startup(self)
        display = Gdk.Display.get_default()
        if display:
            Gtk.StyleContext.add_provider_for_display(
                display, self._css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            )

    def do_activate(self):
        win = self.props.active_window
        if not win:
            win_cls = STYLES[self.style]
            win = win_cls(self)
        win.present()


def parse_args(argv):
    parser = argparse.ArgumentParser(description="System Actions style gallery")
    parser.add_argument("style_pos", nargs="?", default=None, help="style name (positional)")
    parser.add_argument("--style", default=None, help="style name")
    parser.add_argument("--list", action="store_true", help="list available styles and exit")
    args = parser.parse_args(argv)
    return args


def main():
    args = parse_args(sys.argv[1:])

    if args.list:
        for name in STYLES:
            print(name)
        return 0

    style = args.style or args.style_pos or "card"
    if style not in STYLES:
        print(f"Unknown style '{style}'. Available styles:", file=sys.stderr)
        for name in STYLES:
            print(f"  {name}", file=sys.stderr)
        return 1

    app = App(style)
    return app.run([])


if __name__ == "__main__":
    sys.exit(main())
