// SPDX-License-Identifier: GPL-2.0-or-later

import {CardStyle} from './card.js';
import {ListStyle} from './list.js';
import {SplitStyle} from './split.js';
import {GridStyle} from './grid.js';
import {RadialStyle} from './radial.js';
import {BentoStyle} from './bento.js';
import {TuiStyle} from './tui.js';
import {DockStyle} from './dock.js';
import {TilesStyle} from './tiles.js';
import {HaloStyle} from './halo.js';
import {CapsuleStyle} from './capsule.js';
import {CirclesStyle} from './circles.js';
import {AvatarStyle} from './avatar.js';
import {PillStyle} from './pill.js';
import {BannerStyle} from './banner.js';

// Deprecated aliases for backward compat with old gsettings values
import {RofiStyle} from './rofi.js';
import {QuickshellStyle} from './quickshell.js';
import {WlogoutStyle} from './wlogout.js';
import {DotsStyle} from './dots.js';
import {End4Style} from './end4.js';

export const STYLES = {
    // generic names (preferred)
    card: CardStyle,
    list: ListStyle,
    split: SplitStyle,
    grid: GridStyle,
    radial: RadialStyle,
    bento: BentoStyle,
    tui: TuiStyle,
    dock: DockStyle,
    tiles: TilesStyle,
    halo: HaloStyle,
    capsule: CapsuleStyle,
    circles: CirclesStyle,
    avatar: AvatarStyle,
    pill: PillStyle,
    banner: BannerStyle,
    // aliases: old tool/dotfiles names -> same impl
    rofi: RofiStyle,
    quickshell: QuickshellStyle,
    wlogout: WlogoutStyle,
    dots: DotsStyle,
    end4: End4Style,
};

export const DEFAULT_STYLE = 'card';
