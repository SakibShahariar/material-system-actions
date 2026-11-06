// SPDX-License-Identifier: GPL-2.0-or-later

// Pure keyboard dispatcher. GNOME key symbols and actor operations are
// injected by the dialog so ordering and behavior can be tested in Node.
export function handleKeyboardNavigation(event, context) {
    const {
        style,
        actions,
        keys,
        keysymToUnicode,
        eventStop,
        eventPropagate,
        getKeyFocus,
        closeDialog,
    } = context;
    const sym = event.get_key_symbol();
    const unicode = keysymToUnicode(sym);

    // A layout-owned confirmation handler gets first refusal (notably Escape).
    if (style.handleDialogKeyPress?.(sym, event))
        return eventStop;

    // While a confirmation is open, only move between its buttons or activate
    // the focused button. Never let action hotkeys reach the sheet behind it.
    if (style._confirmation) {
        const confirmation = style._confirmation;
        const focused = getKeyFocus();
        if (sym === keys.enter || sym === keys.keypadEnter || sym === keys.space) {
            if (focused && typeof focused.emit === 'function') {
                try {
                    style.pressFlash?.(focused);
                    focused.emit('clicked');
                } catch (_e) {}
            }
        } else if ([
            keys.tab, keys.isoLeftTab,
            keys.left, keys.right, keys.up, keys.down,
        ].includes(sym)) {
            const backwards = sym === keys.isoLeftTab || sym === keys.left || sym === keys.up;
            const next = backwards
                ? (focused === confirmation.confirmBtn ? confirmation.cancelBtn : confirmation.confirmBtn)
                : (focused === confirmation.cancelBtn ? confirmation.confirmBtn : confirmation.cancelBtn);
            try { next.grab_key_focus(); } catch (_e) { next.grab_focus?.(); }
        }
        return eventStop;
    }

    if (sym === keys.escape) {
        closeDialog();
        return eventStop;
    }

    // Action hotkeys precede hjkl navigation so keys such as "l" can activate
    // Lock instead of moving focus.
    if (unicode) {
        const character = String.fromCharCode(unicode).toLowerCase();
        const action = style._keyMap?.[character];
        if (character && action) {
            style.trigger(action);
            return eventStop;
        }
    }

    // Layouts such as TUI, List, and Grid may consume keys before generic nav.
    if (style.onKeyPress?.(sym, event))
        return eventStop;

    if ([keys.left, keys.up, keys.h, keys.k, keys.isoLeftTab].includes(sym)) {
        if (style.moveNav(-1))
            return eventStop;
    }
    if ([keys.right, keys.down, keys.l, keys.j, keys.tab].includes(sym)) {
        if (style.moveNav(1))
            return eventStop;
    }

    if (sym === keys.enter || sym === keys.keypadEnter || sym === keys.space) {
        const focused = getKeyFocus();
        if (focused && typeof focused.emit === 'function') {
            try {
                style.pressFlash?.(focused);
                focused.emit('clicked');
                return eventStop;
            } catch (_e) {}
        }
        const index = style._focusedIdx ?? 0;
        const widget = style._navWidgets?.[index];
        if (widget) {
            style.pressFlash?.(widget);
            widget.emit('clicked');
            return eventStop;
        }
    }

    // Digit 1–9 quick-select follows the current visible action order.
    if (sym >= keys.one && sym <= keys.nine) {
        const index = sym - keys.one;
        if (index < actions.all.length) {
            style.trigger(actions.all[index]);
            return eventStop;
        }
    }
    if (sym >= keys.keypadOne && sym <= keys.keypadNine) {
        const index = sym - keys.keypadOne;
        if (index < actions.all.length) {
            style.trigger(actions.all[index]);
            return eventStop;
        }
    }

    return eventPropagate;
}
