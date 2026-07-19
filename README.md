# Youooo Games

Youooo Games is a static browser-gaming platform published at [game.youooo.com](https://game.youooo.com). It combines an original dashboard interface with eleven playable games and remains compatible with GitHub Pages.

## Platform pages

- `index.html` — platform home
- `dashboard.html` — local player progress, favorites, and activity
- `games.html` — searchable and filterable game library
- `leaderboards.html` — clearly labeled demonstration leaderboards
- `achievements.html` — achievement progress stored on the current device
- `rewards.html` — seven-day demonstration reward calendar
- `admin.html` — safe front-end administration prototype
- `classic-games.html` — preserved playable hub for Chess, Checkers, Gems Crush, Snake, and Merge Fruit

Shared platform presentation and behavior live in `platform.css` and `platform.js`. The older game hub continues to use `style.css`, `script.js`, `leaderboard.js`, `snake-extra.js`, `merge-fruit-extra.js`, and `gems-upgrade.js`.

## Games and routes

| Game | Play route |
| --- | --- |
| Chess | `classic-games.html#chess` |
| Checkers | `classic-games.html#checkers` |
| Gems Crush | `classic-games.html#gems-crush` |
| Snake | `classic-games.html#snake` |
| Merge Fruit | `classic-games.html#merge-fruit` |
| Mesopotamia Mahjong | `mesopotamia-mahjong.html` |
| Stickman Escape | `stickman-escape.html` |
| Stickman Arena | `stickman-arena.html` |
| Stickman Maze Run | `stickman-maze-run.html` |
| Stickman Smart Escape | `stickman-smart-escape.html` |
| Stickman Odyssey | `stickman-odyssey.html` |

The public SEO landing routes `chess.html`, `checkers.html`, `gems-crush.html`, `snake.html`, and `merge-fruit.html` remain available and direct players to the matching preserved game view.

## Local persistence

The dashboard uses the `youooo_platform_state_v1` localStorage record for:

- Player display name
- Favorites
- Recent and played games
- Coins and XP
- Daily reward streak and history
- Achievement progress derived from local activity

This data stays on the visitor’s device. The demo leaderboards, example chart, and admin metrics are interface prototypes and are not presented as live server data.

## Artwork

The new platform uses local CSS color compositions and text-based game symbols so it does not depend on third-party imagery. These are intentional lightweight placeholders. They can later be replaced with optimized screenshots created from the actual games while keeping the same card markup and accessible labels.

## Run locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Deployment

GitHub Pages serves the repository from `main`. Keep `CNAME` exactly:

```text
game.youooo.com
```

The site has no build step. Commit static files and push to `main` to deploy.

## Backup

The homepage that preceded the dashboard rebuild is preserved in two ways:

- Git branch: `backup/pre-gaming-dashboard-20260718`
- Playable repository route: `classic-games.html`

## License

See `LICENSE`.
