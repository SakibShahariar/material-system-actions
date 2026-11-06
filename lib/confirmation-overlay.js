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

    let detailsLabel = null;
    if (details) {
        detailsLabel = new St.Label({
            text: details,
            x_align: Clutter.ActorAlign.START,
            style: 'max-width: 420px;',
        });
        detailsLabel.clutter_text.line_wrap = true;
        detailsLabel.accessible_name = detailsAccessibleName;
        detailsLabel.accessible_description = detailsAccessibleDescription;
        root.add_child(detailsLabel);
    }

    const buttonRow = new St.BoxLayout({
        style: 'spacing: 10px;',
        x_align: Clutter.ActorAlign.CENTER,
    });
    const cancelButton = new St.Button({
        label: cancelLabel,
        accessible_name: cancelAccessibleName,
        accessible_description: cancelAccessibleDescription,
        style_class: 'sa-pill-btn',
        can_focus: true,
    });
    const confirmButton = new St.Button({
        label: confirmLabel,
        accessible_name: confirmAccessibleName,
        accessible_description: confirmAccessibleDescription,
        style_class: confirmStyleClass,
        can_focus: true,
    });
    buttonRow.add_child(cancelButton);
    buttonRow.add_child(confirmButton);
    root.add_child(buttonRow);

    cancelButton.connect('clicked', () => onCancel?.());
    confirmButton.connect('clicked', () => onConfirm?.());

    return {root, bodyLabel, detailsLabel, cancelButton, confirmButton};
}
