# === Dev ===
dev:
    npm run dev

typecheck:
    npm run typecheck

install:
    npm install

# === Build ===
build:
    npm run build

build-renderer:
    npm run build:renderer

build-main:
    npm run build:main

# === Clean ===
kill:
    taskkill /F /IM Beaver.exe /IM electron.exe 2>/dev/null || true

clean:
    rm -rf release dist

clean-all: kill clean

# === Package ===
package:
    ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/" npm run package

package-direct:
    npm run package:direct

package-fresh: clean-all
    ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/" npm run package

package-mirror:
    ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/" npm run package

package-local:
    ELECTRON_CACHE="resources" ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/" npm run package

package-full:
    ELECTRON_CACHE="resources" ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/" npm run package

# === Utils ===
help:
    just --list

ls:
    npm run
