from pathlib import Path
from datetime import datetime, timedelta, timezone
import os, re, json
import jwt, pandas as pd, numpy as np, httpx
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, Session

SECRET=os.getenv('SECRET_KEY','change-this-in-production'); DB=os.getenv('DATABASE_URL','sqlite:///./insightforge.db'); UP=Path(os.getenv('UPLOAD_DIR','./data/uploads')); UP.mkdir(parents=True,exist_ok=True)
engine=create_engine(DB,connect_args={'check_same_thread':False} if DB.startswith('sqlite') else {})
SessionLocal=sessionmaker(bind=engine)
class Base(DeclarativeBase): pass
class User(Base):
    __tablename__='users'; id:Mapped[int]=mapped_column(primary_key=True); name:Mapped[str]=mapped_column(String(120)); email:Mapped[str]=mapped_column(String(255),unique=True,index=True); password_hash:Mapped[str]=mapped_column(String(255)); created_at:Mapped[datetime]=mapped_column(DateTime,default=datetime.utcnow)
class Dataset(Base):
    __tablename__='datasets'; id:Mapped[int]=mapped_column(primary_key=True); owner_id:Mapped[int]=mapped_column(ForeignKey('users.id'),index=True); name:Mapped[str]=mapped_column(String(255)); filename:Mapped[str]=mapped_column(String(255)); path:Mapped[str]=mapped_column(String(1000)); created_at:Mapped[datetime]=mapped_column(DateTime,default=datetime.utcnow)
Base.metadata.create_all(engine)
pwd=CryptContext(schemes=['bcrypt'],deprecated='auto'); bearer=HTTPBearer()
class Register(BaseModel): name:str; email:EmailStr; password:str
class Login(BaseModel): email:EmailStr; password:str
class Prompt(BaseModel): prompt:str
def db():
    d=SessionLocal()
    try: yield d
    finally:d.close()
def token(uid): return jwt.encode({'sub':str(uid),'exp':datetime.now(timezone.utc)+timedelta(days=1)},SECRET,algorithm='HS256')
def user(creds:HTTPAuthorizationCredentials=Depends(bearer),d:Session=Depends(db)):
    try: uid=int(jwt.decode(creds.credentials,SECRET,algorithms=['HS256'])['sub'])
    except: raise HTTPException(401,'Invalid or expired token')
    u=d.get(User,uid)
    if not u: raise HTTPException(401,'User not found')
    return u
def load(path):
    e=Path(path).suffix.lower()
    if e=='.csv': return pd.read_csv(path)
    if e=='.tsv': return pd.read_csv(path,sep='\t')
    if e in ('.xlsx','.xls'): return pd.read_excel(path)
    if e=='.json': return pd.read_json(path)
    raise ValueError('Unsupported format')
def clean(df):
    x=df.drop_duplicates().copy()
    for c in x.columns:
        if pd.api.types.is_numeric_dtype(x[c]): x[c]=x[c].fillna(x[c].median())
        else:
            m=x[c].mode(dropna=True); x[c]=x[c].fillna(m.iloc[0] if len(m) else 'Unknown')
    return x
def js(v):
    if isinstance(v,(np.integer,)): return int(v)
    if isinstance(v,(np.floating,)): return float(v) if np.isfinite(v) else None
    return v
def profile(df):
    nums=list(df.select_dtypes(include=np.number).columns); cm=df[nums].corr() if len(nums)>1 else pd.DataFrame(); pairs=[]
    for i,a in enumerate(nums):
        for b in nums[i+1:]:
            v=cm.loc[a,b]
            if pd.notna(v): pairs.append({'x':a,'y':b,'value':round(float(v),3)})
    pairs=sorted(pairs,key=lambda z:abs(z['value']),reverse=True)[:8]
    return {'rows':len(df),'columns':len(df.columns),'numeric_columns':nums,'categorical_columns':[c for c in df.columns if c not in nums],'missing_values':int(df.isna().sum().sum()),'duplicate_rows':int(df.duplicated().sum()),'top_correlations':pairs}
def charts(df):
    nums=list(df.select_dtypes(include=np.number).columns); cats=[c for c in df.columns if c not in nums]; out=[]
    if nums: out.append({'type':'histogram','title':f'Distribution of {nums[0]}','x':nums[0],'values':[js(v) for v in df[nums[0]].dropna().head(5000)]})
    if cats and nums:
        g=df.groupby(cats[0],dropna=False)[nums[0]].mean().head(20); out.append({'type':'bar','title':f'{nums[0]} by {cats[0]}','labels':[str(v) for v in g.index],'values':[js(v) for v in g.values]})
    if len(nums)>1:
        q=df[[nums[0],nums[1]]].dropna().head(5000); out.append({'type':'scatter','title':f'{nums[0]} vs {nums[1]}','x':[js(v) for v in q[nums[0]]],'y':[js(v) for v in q[nums[1]]]})
    return out
def analyze(df):
    raw=profile(df); x=clean(df); cp=profile(x); ins=[]
    if raw['missing_values']: ins.append(f"{raw['missing_values']} missing values detected; numeric values use median imputation and categorical values use the mode.")
    if raw['duplicate_rows']: ins.append(f"{raw['duplicate_rows']} duplicate rows detected and removed during preprocessing.")
    if cp['top_correlations']:
        c=cp['top_correlations'][0]; ins.append(f"Strongest numeric relationship: {c['x']} vs {c['y']} with correlation {c['value']:.2f}.")
    if not ins: ins.append('The dataset is structurally clean with no major missing-value or duplicate-row issue detected.')
    return {'profile':raw,'clean_profile':cp,'insights':ins,'charts':charts(x),'preview':x.head(25).replace({np.nan:None}).to_dict(orient='records')}
async def llm(prompt,context):
    p=os.getenv('AI_PROVIDER','local').lower(); msgs=[{'role':'system','content':'You are InsightForge, a concise autonomous data analyst. Do not invent numbers; use supplied computed context.'},{'role':'user','content':json.dumps({'request':prompt,'context':context})}]
    if p=='groq' and os.getenv('GROQ_API_KEY'):
        url='https://api.groq.com/openai/v1/chat/completions'; headers={'Authorization':'Bearer '+os.getenv('GROQ_API_KEY')}; model=os.getenv('GROQ_MODEL','llama-3.3-70b-versatile')
    elif p=='openai' and os.getenv('OPENAI_API_KEY'):
        url='https://api.openai.com/v1/chat/completions'; headers={'Authorization':'Bearer '+os.getenv('OPENAI_API_KEY')}; model=os.getenv('OPENAI_MODEL','gpt-4o-mini')
    elif p=='ollama':
        url=os.getenv('OLLAMA_BASE_URL','http://localhost:11434').rstrip('/')+'/v1/chat/completions'; headers={}; model=os.getenv('OLLAMA_MODEL','llama3.2')
    else:return None
    try:
        async with httpx.AsyncClient(timeout=60) as c:
            r=await c.post(url,headers=headers,json={'model':model,'messages':msgs,'temperature':.2}); r.raise_for_status(); return r.json()['choices'][0]['message']['content']
    except:return None
app=FastAPI(title='InsightForge API'); app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:5173','http://127.0.0.1:5173'],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
@app.get('/api/health')
def health():return {'status':'ok'}
@app.post('/api/auth/register')
def register(x:Register,d:Session=Depends(db)):
    if len(x.password)<8: raise HTTPException(400,'Password must be at least 8 characters')
    if d.query(User).filter(User.email==x.email.lower()).first(): raise HTTPException(409,'Email already registered')
    u=User(name=x.name.strip(),email=x.email.lower(),password_hash=pwd.hash(x.password)); d.add(u); d.commit(); d.refresh(u); return {'access_token':token(u.id),'user':{'id':u.id,'name':u.name,'email':u.email}}
@app.post('/api/auth/login')
def login(x:Login,d:Session=Depends(db)):
    u=d.query(User).filter(User.email==x.email.lower()).first()
    if not u or not pwd.verify(x.password,u.password_hash): raise HTTPException(401,'Invalid email or password')
    return {'access_token':token(u.id),'user':{'id':u.id,'name':u.name,'email':u.email}}
@app.get('/api/auth/me')
def me(u=Depends(user)): return {'id':u.id,'name':u.name,'email':u.email}
@app.get('/api/datasets')
def datasets(u=Depends(user),d:Session=Depends(db)):
    return [{'id':x.id,'name':x.name,'filename':x.filename,'created_at':x.created_at} for x in d.query(Dataset).filter(Dataset.owner_id==u.id).order_by(Dataset.created_at.desc()).all()]
@app.post('/api/datasets/upload')
async def upload(file:UploadFile=File(...),u=Depends(user),d:Session=Depends(db)):
    ext=Path(file.filename or '').suffix.lower()
    if ext not in {'.csv','.tsv','.xlsx','.xls','.json'}: raise HTTPException(400,'Use CSV, TSV, XLSX, XLS or JSON')
    b=await file.read(); maxb=int(os.getenv('MAX_UPLOAD_MB','50'))*1024*1024
    if len(b)>maxb: raise HTTPException(413,'File too large')
    folder=UP/str(u.id); folder.mkdir(parents=True,exist_ok=True); path=folder/(os.urandom(12).hex()+ext); path.write_bytes(b)
    try: load(path)
    except Exception as e: path.unlink(missing_ok=True); raise HTTPException(400,f'Cannot read dataset: {e}')
    x=Dataset(owner_id=u.id,name=Path(file.filename).stem,filename=file.filename,path=str(path)); d.add(x); d.commit(); d.refresh(x); return {'id':x.id,'name':x.name,'filename':x.filename,'created_at':x.created_at}
def owned(i,u,d):
    x=d.get(Dataset,i)
    if not x or x.owner_id!=u.id: raise HTTPException(404,'Dataset not found')
    return x
@app.get('/api/datasets/{i}/analyze')
def analysis(i:int,u=Depends(user),d:Session=Depends(db)): return analyze(load(owned(i,u,d).path))
@app.get('/api/datasets/{i}/preview')
def preview(i:int,u=Depends(user),d:Session=Depends(db)):
    x=load(owned(i,u,d).path); return {'columns':list(x.columns),'rows':x.head(50).replace({np.nan:None}).to_dict(orient='records'),'shape':[len(x),len(x.columns)]}
@app.post('/api/chat/{i}')
async def chat(i:int,x:Prompt,u=Depends(user),d:Session=Depends(db)):
    df=load(owned(i,u,d).path); result=analyze(df) if any(k in x.prompt.lower() for k in ['analy','dashboard','overview','preprocess','clean']) else {'profile':profile(df),'message':'Local engine ready. Ask for analysis, preprocessing, a dashboard, correlations, or a numeric summary.'}
    answer=await llm(x.prompt,result) or result
    return {'answer':answer,'mode':'llm' if isinstance(answer,str) else 'local'}
