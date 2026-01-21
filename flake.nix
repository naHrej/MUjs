{
  description = "MUjs dev shell for electron-builder packaging";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          # Node / build basics
          nodejs_20
          yarn
          python3
          pkg-config
          git

          # Electron builder packaging deps
          dpkg
          fakeroot
          rpm

          # Runtime/packaging libs (match deb deps)
          gtk3
          libnotify
          nss
          xorg.libXScrnSaver
          xorg.libXtst
          xdg-utils
          at-spi2-core
          util-linux             # libuuid
          libsecret
          libappindicator-gtk3
          wine
          zip
          gh
          # Provide libcrypt.so.1 for fpm/ruby
          libxcrypt-legacy
        ];

shellHook = ''
        # Add libxcrypt-legacy to LD_LIBRARY_PATH so fpm can find libcrypt.so.1
        export LD_LIBRARY_PATH="${pkgs.libxcrypt-legacy}/lib:$LD_LIBRARY_PATH"
        
        echo "🛠  MUjs dev shell ready. Use: npm install && npm run build or npm run package:linux"
      '';
      };
    };
}