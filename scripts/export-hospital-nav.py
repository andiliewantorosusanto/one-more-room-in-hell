"""Extract c8m4's validated NAV area records; L4D2 custom tails stay untouched.
The retail subversion 14 adds variable custom data. Locate the standard area
headers, then require the exact declared count and closed connection references.
This extractor is deliberately limited to the No Mercy hospital BSP/NAV pair.
"""
import argparse,json,math,pathlib,struct

def extract(path):
 d=pathlib.Path(path).read_bytes()
 assert struct.unpack_from('<III',d)==(0xFEEDFACE,16,14),'Expected L4D2 NAV v16/sub14'
 assert struct.unpack_from('<I',d,12)[0]==24986000,'Expected the retail c8m4_interior BSP/NAV pair'
 p=17;n,=struct.unpack_from('<H',d,p);p+=2
 for _ in range(n):
  size,=struct.unpack_from('<H',d,p);p+=2+size
 p+=1
 # L4D's mission name and two flags precede the area count.
 p=d.index(0,p)+3
 count,=struct.unpack_from('<I',d,p);p+=4
 areas=[]
 for offset in range(p,len(d)-60):
  id,flags,*v=struct.unpack_from('<II8f',d,offset)
  if not 0<id<1000000 or not all(math.isfinite(n) for n in v):continue
  x,z,y,X,Z,Y,ne,sw=v
  if not (8000<x<18000 and 8000<z<18000 and 8000<X<18000 and 8000<Z<18000 and 0<X-x<3000 and 0<Z-z<3000 and all(-1000<k<8000 for k in [y,Y,ne,sw])):continue
  end=offset+40;links=[]
  for _ in range(4):
   n,=struct.unpack_from('<I',d,end);end+=4
   if n>100 or end+4*n>len(d):break
   links.extend(struct.unpack_from('<'+str(n)+'I',d,end));end+=4*n
  else:
   if all(0<k<1000000 for k in links):areas.append({'id':id,'flags':flags,'bounds':v,'links':links})
 assert len(areas)==count,(len(areas),count)
 ids={a['id'] for a in areas};assert len(ids)==count and all(k in ids for a in areas for k in a['links'])
 return {'origin':[12417.9,12448.1,16], 'areas':areas}

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');a=p.parse_args()
 data=extract(a.input);pathlib.Path(a.output).write_text(json.dumps(data,separators=(',',':')))
 print('Validated',len(data['areas']),'areas and every connection')
