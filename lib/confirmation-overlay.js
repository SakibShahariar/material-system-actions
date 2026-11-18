// SPDX-License-Identifier: GPL-2.0-or-later

import St from 'gi://St';
import Clutter from 'gi://Clutter';

// Shared confirmation presentation for destructive actions and suspend
// inhibitor warnings. Focus restoration and dialog cleanup remain owned by
// BaseStyle, while this component owns the accessible widget tree and wiring.
export function createConfirmationOverlay({
    heading,
    body,
    details = null,
    detailsItems = null,
    rootStyle = 'spacing: 12px; min-width: 300px;',
    accessibleName = heading,
    accessibleDescription = body,
    bodyAccessibleDescription = body,
    detailsAccessibleName = 'Additional details',
    detailsAccessibleDescription = details,
    cancelLabel = 'Cancel',
    cancelAccessibleName = 'Cancel',
    cancelAccessibleDescription = 'Cancel this action; no action will be taken.',
    confirmLabel = 'Confirm',
    confirmAccessibleName = 'Confirm',
    confirmAccessibleDescription = body,
    confirmStyleClass = 'sa-pill-btn sa-tier-error',
    onCancel,
    onConfirm,
}) {
    const root = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: 'sa-panel',
        style: rootStyle,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
    });
    root.accessible_name = accessibleName;
    root.accessible_description = accessibleDescription;
    root.add_child(new St.Label({
        text: heading,
        style: 'font-weight: 700; font-size: 1.1em;',
        x_align: Clutter.ActorAlign.CENTER,
    }));

    const bodyLabel = new St.Label({
        text: body,
        style_class: 'sa-muted',
        x_align: Clutter.ActorAlign.CENTER,
        style: 'text-align: center;',
    });
    bodyLabel.accessible_description = bodyAccessibleDescription;
    root.add_child(bodyLabel);

    let detailsBox = null;
    if (details) {
        const items = Array.isArray(detailsItems) && detailsItems.length
            ? detailsItems
            : [{who: null, why: details, mode: null}];
        detailsBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'sa-confirm-details',
        });
        // Keep the flat text for assistive technology; only the visual layout
        // is split into a title and a wrapped reason/mode line per inhibitor.
        detailsBox.accessible_name = detailsAccessibleName;
        detailsBox.accessible_description = detailsAccessibleDescription;
        for (const item of items) {
            const row = new St.BoxLayout({
                orientation: Clutter.Orientation.VERTICAL,
                style_class: 'sa-confirm-details-item',
            });
            if (item.who) {
                row.add_child(new St.Label({
                    text: item.who,
                    style_class: 'sa-confirm-details-title',
                    x_align: Clutter.ActorAlign.START,
                }));
            }
            const metaText = item.mode ? `${item.why}  ·  ${item.mode}` : item.why;
            const meta = new St.Label({
                text: metaText,
                style_class: 'sa-confirm-details-meta',
                x_align: Clutter.ActorAlign.START,
            });
            meta.clutter_text.line_wrap = true;
            row.add_child(meta);
            detailsBox.add_child(row);
        }
        root.add_child(detailsBox);
    }

    const buttonRow = new St.BoxLayout({
        style: 'spacing: 10px;',
        x_align: Clutter.ActorAlign.CENTER,
    });
    const cancelButton = new St.Button({
        label: cancelLabel,
        accessible_name: cancelAccessibleName,
        style_class: 'sa-pill-btn',
        can_focus: true,
        reactive: true,
    });
    const confirmButton = new St.Button({
        label: confirmLabel,
        accessible_name: confirmAccessibleName,
        style_class: confirmStyleClass,
        can_focus: true,
        reactive: true,
    });
    // `accessible_description` is not a construct-only property on all
    // supported GNOME Shell St.Button versions. Set it defensively after
    // construction so an unsupported accessibility field cannot abort the
    // confirmation overlay before it is displayed.
    try { cancelButton.accessible_description = cancelAccessibleDescription; } catch (_e) {}
    try { confirmButton.accessible_description = confirmAccessibleDescription; } catch (_e) {}
    buttonRow.add_child(cancelButton);
    buttonRow.add_child(confirmButton);
    root.add_child(buttonRow);

    cancelButton.connect('clicked', () => onCancel?.());
    confirmButton.connect('clicked', () => onConfirm?.());

    return {root, bodyLabel, detailsBox, detailsLabel: detailsBox, cancelButton, confirmButton};
}
