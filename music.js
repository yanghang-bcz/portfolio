/* Favorite artwork is copied from Desktop/cover in file order; metadata matches the existing cover catalogue.
   Recent listening uses verified official artwork and user-selected genre labels. */
(() => {
  'use strict';
  const favorites = [
  {
    "id": "favorite-1",
    "color": "#827b6d",
    "cover": "assets/music/01_Ringo_Sheena_Karuki_Zahmen_Kuri_no_Hana.jpg",
    "title": "加爾基 精液 栗ノ花",
    "artist": "椎名林檎",
    "tilt": -2.5,
    "offset": 0
  },
  {
    "id": "favorite-2",
    "color": "#827b6d",
    "cover": "assets/music/02_Ringo_Sheena_Shouso_Strip.jpg",
    "title": "勝訴ストリップ",
    "artist": "椎名林檎",
    "tilt": 1.8,
    "offset": 5
  },
  {
    "id": "favorite-3",
    "color": "#827b6d",
    "cover": "assets/music/03_Kendrick_Lamar_To_Pimp_a_Butterfly.webp",
    "title": "To Pimp a Butterfly",
    "artist": "Kendrick Lamar",
    "tilt": -1.2,
    "offset": -2
  },
  {
    "id": "favorite-4",
    "color": "#827b6d",
    "cover": "assets/music/04_Bjork_Vespertine.jpg",
    "title": "Vespertine",
    "artist": "Björk",
    "tilt": 2.2,
    "offset": 4
  },
  {
    "id": "favorite-5",
    "color": "#827b6d",
    "cover": "assets/music/05_Stan_Getz_Joao_Gilberto_Getz_Gilberto.jpg",
    "title": "Getz/Gilberto",
    "artist": "Stan Getz & João Gilberto",
    "tilt": -2,
    "offset": -3
  },
  {
    "id": "favorite-6",
    "color": "#827b6d",
    "cover": "assets/music/06_Frank_Ocean_channel_ORANGE.webp",
    "title": "channel ORANGE",
    "artist": "Frank Ocean",
    "tilt": 2.6,
    "offset": 2
  },
  {
    "id": "favorite-7",
    "color": "#827b6d",
    "cover": "assets/music/07_Pink_Floyd_Animals_1977_Original.jpg",
    "title": "Animals",
    "artist": "Pink Floyd",
    "tilt": -1.7,
    "offset": -1
  },
  {
    "id": "favorite-8",
    "color": "#827b6d",
    "cover": "assets/music/08_Godspeed_You_Black_Emperor_Lift_Your_Skinny_Fists.jpg",
    "title": "Lift Your Skinny Fists Like Antennas to Heaven",
    "artist": "Godspeed You! Black Emperor",
    "tilt": 1.1,
    "offset": 5
  },
  {
    "id": "favorite-9",
    "color": "#827b6d",
    "cover": "assets/music/09_The_Microphones_The_Glow_Pt_2.jpg",
    "title": "The Glow, Pt. 2",
    "artist": "The Microphones",
    "tilt": -2.4,
    "offset": 1
  },
  {
    "id": "favorite-10",
    "color": "#827b6d",
    "cover": "assets/music/10_Faye_Wong_Fable.jpg",
    "title": "寓言",
    "artist": "王菲",
    "tilt": 2,
    "offset": 3
  },
  {
    "id": "favorite-11",
    "color": "#827b6d",
    "cover": "assets/music/11_Sweet_Trip_Velocity_Design_Comfort.jpg",
    "title": "Velocity: Design: Comfort.",
    "artist": "Sweet Trip",
    "tilt": -1.3,
    "offset": -2
  },
  {
    "id": "favorite-12",
    "color": "#827b6d",
    "cover": "assets/music/12_Magdalena_Bay_Imaginal_Disk.jpg",
    "title": "Imaginal Disk",
    "artist": "Magdalena Bay",
    "tilt": 2.4,
    "offset": 4
  }
];
  const lately = [
  {
    "id": "repeat-1",
    "color": "#827b6d",
    "cover": "assets/music/repeat_01_The_Avalanches_No_Bad_Memories.jpg",
    "title": "No Bad Memories",
    "artist": "The Avalanches",
    "genre": "Nu-disco"
  },
  {
    "id": "repeat-2",
    "color": "#827b6d",
    "cover": "assets/music/repeat_02_Ichiko_Aoba_15th_Anniversary_Concert.jpg",
    "title": "15th Anniversary Concert",
    "artist": "青葉市子",
    "genre": "Contemporary Folk"
  },
  {
    "id": "repeat-3",
    "color": "#827b6d",
    "cover": "assets/music/repeat_03_heavensouls_cantu_of_the_sower.jpg",
    "title": "\"cantu\" of the sower",
    "artist": "heavensouls",
    "genre": "IDM"
  },
  {
    "id": "repeat-4",
    "color": "#827b6d",
    "cover": "assets/music/repeat_04_Trooper_Salute_Tomodachi_ga_Imashita.jpg",
    "title": "友達がいました",
    "artist": "Trooper Salute",
    "genre": "Indie Rock"
  }
];

  function renderAlbums(targetId, albums, showCaption) {
    const target = document.getElementById(targetId);
    if (!target) return;
    if (!showCaption) target.setAttribute("aria-label", "Favo 12 专辑收藏，按文件顺序展示，不代表排名");
    const fragment = document.createDocumentFragment();
    albums.forEach((album, index) => {
      const item = document.createElement('li');
      item.className = 'album-item';
      item.dataset.albumId = album.id;
      const figure = document.createElement('figure');
      figure.className = 'album-figure';
      const cover = document.createElement('div');
      cover.className = 'album-cover';
      cover.style.setProperty('--cover-color', album.color);
      if (album.cover) {
        const image = document.createElement('img');
        // 分级加载：Music 的 16 张封面要等这个栏目真的被打开才取（见 tiered.js）
        image.dataset.src = album.cover;
        image.dataset.tier = 'music';
        // AVIF 优先；album.cover 那一份是回退（旧 JPEG，或 WebP 更小时换成的 WebP）
        if (/^assets\/music\/.+\.jpg$/.test(album.cover)) {
          image.dataset.avif = album.cover.replace(/\.jpg$/, '.avif');
        }
        image.alt = album.title ? `${album.title} — ${album.artist}` : '专辑封面';
        image.loading = showCaption ? 'eager' : 'lazy';
        image.decoding = 'async';
        cover.append(image);
      } else {
        cover.setAttribute('role', 'img');
        cover.setAttribute('aria-label', `专辑封面占位 ${String(index + 1).padStart(2, '0')}`);
        if (!showCaption) {
          const number = document.createElement('span');
          number.className = 'album-number';
          number.setAttribute('aria-hidden', 'true');
          number.textContent = String(index + 1).padStart(2, '0');
          cover.append(number);
        }
      }
      if (!showCaption) {
        item.classList.add('favorite-album');
        item.style.setProperty('--album-tilt', `${album.tilt}deg`);
        item.style.setProperty('--album-offset', `${album.offset}px`);
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'album-toggle';
        toggle.setAttribute('aria-label', `${album.title} — ${album.artist}`);
        toggle.setAttribute('aria-pressed', 'false');
        toggle.setAttribute('aria-describedby', `${album.id}-info`);
        cover.querySelector('img')?.setAttribute('alt', '');
        toggle.append(cover);
        figure.append(toggle);
        const info = document.createElement('figcaption');
        info.className = 'favorite-info';
        info.id = `${album.id}-info`;
        const name = document.createElement('span');
        name.className = 'favorite-title';
        name.textContent = album.title;
        const artist = document.createElement('span');
        artist.className = 'favorite-artist';
        artist.textContent = album.artist;
        info.append(name, artist);
        figure.append(info);
        item.addEventListener('pointerenter', event => {
          if (event.pointerType !== 'touch') item.classList.add('is-hovered');
        });
        item.addEventListener('pointerleave', () => item.classList.remove('is-hovered'));
        toggle.addEventListener('click', () => {
          const pin = !item.classList.contains('is-pinned');
          clearPinned();
          if (pin) { item.classList.add('is-pinned'); toggle.setAttribute('aria-pressed', 'true'); }
        });
      } else {
        figure.append(cover);
      }
      if (showCaption) {
        const caption = document.createElement('figcaption');
        caption.className = 'album-caption';
        const title = document.createElement('span');
        title.className = 'album-name';
        title.textContent = album.title || 'Album title';
        const artist = document.createElement('span');
        artist.className = 'album-artist';
        artist.textContent = album.artist || 'Artist name';
        const titleRow = document.createElement('div');
        titleRow.className = 'album-title-row';
        const genre = document.createElement('span');
        genre.className = 'album-genre';
        genre.textContent = album.genre;
        titleRow.append(title, genre);
        caption.append(titleRow, artist);
        figure.append(caption);
      }
      item.append(figure);
      fragment.append(item);
    });
    target.replaceChildren(fragment);
  }
  function clearPinned() {
    document.querySelectorAll('#favorite-albums .is-pinned').forEach(item => {
      item.classList.remove('is-pinned');
      item.querySelector('button').setAttribute('aria-pressed', 'false');
    });
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('#favorite-albums .album-toggle')) clearPinned();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') clearPinned();
  });
  renderAlbums('favorite-albums', favorites, false);
  renderAlbums('repeat-albums', lately, true);
})();
