// Kafra Guard Pro splash art: strict PNG check and rebuild (docs/PHASE3-SPLASH.md in kafra-shield).
// Only a 640x480, 8-bit RGB/RGBA, non-interlaced PNG passes. Its pixels are fully decompressed and checked, then a new
// PNG is written with only IHDR + IDAT + IEND, so text/EXIF/unknown chunks and appended data never reach a player.
export const splashSize={width:640,height:480},maxUpload=900*1024;
const signature=[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const u32=(b,o)=>((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0;
const concat=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;};
async function pipe(bytes,stream,limit){
  const reader=new Blob([bytes]).stream().pipeThrough(stream).getReader();const parts=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('invalid_image');}parts.push(value);}
  return concat(parts);
}
function chunk(type,data){
  const out=new Uint8Array(12+data.length),view=new DataView(out.buffer);view.setUint32(0,data.length);
  out.set(new TextEncoder().encode(type),4);out.set(data,8);view.setUint32(8+data.length,crc32(out.subarray(4,8+data.length)));return out;
}
// Returns the rebuilt PNG (Uint8Array) or throws Error('invalid_image' | 'image_too_large' | 'image_size').
export async function cleanPng(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length<57)throw new Error('invalid_image');
  if(bytes.length>maxUpload)throw new Error('image_too_large');
  if(signature.some((b,i)=>bytes[i]!==b))throw new Error('invalid_image');
  let offset=8,header=null,ended=false,idatDone=false;const idat=[];
  while(offset<bytes.length){
    if(ended||offset+12>bytes.length)throw new Error('invalid_image');
    const length=u32(bytes,offset),type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));
    if(!/^[A-Za-z]{4}$/.test(type)||offset+12+length>bytes.length)throw new Error('invalid_image');
    const data=bytes.subarray(offset+8,offset+8+length);
    if(crc32(bytes.subarray(offset+4,offset+8+length))!==u32(bytes,offset+8+length))throw new Error('invalid_image');
    if(!header&&type!=='IHDR')throw new Error('invalid_image');
    if(type==='IHDR'){
      if(header||length!==13)throw new Error('invalid_image');
      header={width:u32(data,0),height:u32(data,4),depth:data[8],color:data[9],compression:data[10],filter:data[11],interlace:data[12]};
      if(header.width!==splashSize.width||header.height!==splashSize.height)throw new Error('image_size');
      if(header.depth!==8||![2,6].includes(header.color)||header.compression||header.filter||header.interlace)throw new Error('invalid_image');
    }else if(type==='IDAT'){if(idatDone)throw new Error('invalid_image');idat.push(data);}
    else if(type==='IEND')ended=true;
    // Other critical chunks (PLTE included) are refused; ancillary ones (text, EXIF, colour profiles…) are dropped.
    else if(type[0]===type[0].toUpperCase()&&type!=='PLTE')throw new Error('invalid_image');
    if(idat.length&&type!=='IDAT')idatDone=true;
    offset+=12+length;
  }
  if(!ended||!idat.length)throw new Error('invalid_image');
  const bpp=header.color===6?4:3,stride=1+header.width*bpp,expected=stride*header.height;
  let pixels;try{pixels=await pipe(concat(idat),new DecompressionStream('deflate'),expected+1);}catch{throw new Error('invalid_image');}
  if(pixels.length!==expected)throw new Error('invalid_image');
  for(let row=0;row<header.height;row++)if(pixels[row*stride]>4)throw new Error('invalid_image');
  const compressed=await pipe(pixels,new CompressionStream('deflate'),expected*2+1024);
  return concat([Uint8Array.from(signature),chunk('IHDR',bytes.subarray(16,29)),chunk('IDAT',compressed),chunk('IEND',new Uint8Array(0))]);
}
// Optional malware check: VirusTotal hash lookup (the file itself is never sent). 'skipped' without VIRUSTOTAL_API_KEY.
export async function scanHash(env,sha256){
  if(!env.VIRUSTOTAL_API_KEY)return 'skipped';
  try{
    const response=await fetch('https://www.virustotal.com/api/v3/files/'+sha256,{headers:{'x-apikey':env.VIRUSTOTAL_API_KEY},signal:AbortSignal.timeout(5000)});
    if(response.status===404)return 'unknown';if(!response.ok)return 'error';
    const stats=(await response.json())?.data?.attributes?.last_analysis_stats??{};
    return (Number(stats.malicious)||0)+(Number(stats.suspicious)||0)>0?'flagged':'clean';
  }catch{return 'error';}
}
