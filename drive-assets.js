/* ===== GOOGLE DRIVE WEBSITE ASSETS ===== */
(function(){
  const API=String(window.DRIVE_UPLOAD_URL||'').trim();
  const ready=window.driveAssetsReady=new Promise((resolve)=>{
    if(!API){resolve(false);return;}
    const cb='xiDriveAssets_'+Date.now()+'_'+Math.floor(Math.random()*100000);
    const sc=document.createElement('script');
    const timer=setTimeout(()=>{cleanup();window.dispatchEvent(new CustomEvent('xi-drive-assets-ready'));resolve(false)},20000);
    function cleanup(){clearTimeout(timer);try{delete window[cb]}catch(_){}try{sc.remove()}catch(_){}
    }
    window[cb]=data=>{
      cleanup();
      try{
        if(!data || (!data.ok && !data.success)){resolve(false);return}
        const music=Array.isArray(data.music?.files)?data.music.files:[];
        const covers=Array.isArray(data.covers?.files)?data.covers.files:[];
        const barcodes=Array.isArray(data.barcode?.files)?data.barcode.files:[];
        const assets=Array.isArray(data.websiteAssets?.files)?data.websiteAssets.files:[];
        const coverMap={};
        covers.forEach(f=>coverMap[normBase(f.name)]=f);
        const known={
          'eid-adha-please-dont-call':['Eid-Adha, Please Don\'t Call','Bleachers'],
          'beautiful-feat-camila-cabello':['Beautiful (feat. Camila Cabello)','Bazzi'],
          'dunia-yang-nanti':['Dunia Yang Nanti','Raim Laode'],
          'blank-space':['Blank Space','Taylor Swift'],
          'wicked-game':['Wicked Game','Chris Isaak'],
          'mrs-magic':['Mrs Magic','Strawberry Guy']
        };
        window.LOCAL_MUSIC=music.map((f,i)=>{
          const key=normBase(f.name), meta=known[key]||[stripExt(f.name),''];
          const cover=coverMap[key]||findCover(key,coverMap);
          const id=f.id||'';
          const download=f.downloadUrl||('https://drive.google.com/uc?export=download&id='+encodeURIComponent(id));
          const userContent=id?('https://drive.usercontent.google.com/download?id='+encodeURIComponent(id)+'&export=download&confirm=t'):'';
          const sources=[download,userContent].filter((u,i,a)=>u&&a.indexOf(u)===i);
          return {id:i,name:meta[0],artist:meta[1]||'Musik',src:sources[0]||'',sources:sources,cover:cover?.viewUrl||cover?.downloadUrl||'',type:f.mimeType||'audio/mpeg',driveId:id};
        });
        window.DRIVE_BARCODE_MAP={};
        barcodes.forEach(f=>{
          const n=stripExt(f.name).trim();
          const u=f.viewUrl||f.downloadUrl||f.openUrl||'';
          window.DRIVE_BARCODE_MAP[n]=u;
          window.DRIVE_BARCODE_MAP[f.name]=u;
        });
        // IMPORTANT: decorative background stays on the original v7 CSS.
        // Drive assets must NEVER overwrite the flower/star CSS variables.
        // This prevents Music/Barcode loading from making the background disappear.
        window.DRIVE_DECORATIVE_ASSETS = {
          flower: findAsset(['lily','flower','bg-flower','bunga'], assets),
          stars: findAsset(['stars','star','bg-stars','bintang'], assets)
        };
        window.DRIVE_ASSETS=data;
        window.dispatchEvent(new CustomEvent('xi-drive-assets-ready'));
        resolve(true);
      }catch(e){resolve(false)}
    };
    sc.onerror=()=>{cleanup();window.dispatchEvent(new CustomEvent('xi-drive-assets-ready'));resolve(false)};
    sc.src=API+(API.includes('?')?'&':'?')+'action=listAssets&callback='+encodeURIComponent(cb)+'&_ts='+Date.now();
    (document.head||document.body).appendChild(sc);
  });
  window.getDriveBarcodeUrl=async function(nisn){await ready;return window.DRIVE_BARCODE_MAP?.[String(nisn)]||''};
  window.getDriveAsset=async function(folder,name){await ready;const list=window.DRIVE_ASSETS?.[folder]?.files||[];return list.find(f=>f.name===name)||null};
  function stripExt(s){return String(s||'').replace(/\.[^.]+$/,'')}
  function normBase(s){return stripExt(String(s||'')).toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  function findCover(key,map){
    const bare=key.replace(/-cover$/,''); const keys=Object.keys(map);
    const direct=keys.find(k=>k===bare||k===bare+'-cover'||k.includes(bare)||bare.includes(k));
    if(direct)return map[direct];
    const tokens=bare.split('-').filter(Boolean); let best=null,bestScore=0;
    keys.forEach(k=>{const kt=k.split('-').filter(Boolean);const score=tokens.filter(t=>kt.includes(t)).length;if(score>bestScore){bestScore=score;best=k}});
    return best&&bestScore>=Math.min(2,tokens.length)?map[best]:null;
  }
  function findAsset(words,arr){
    const score=(n)=>{const k=normBase(n);let s=0;words.forEach(w=>{const x=normBase(w);if(k===x)s+=10;else if(k.includes(x)||x.includes(k))s+=3});return s};
    return arr.slice().sort((a,b)=>score(b.name)-score(a.name))[0] || null;
  }
})();
