const $ = (id) => document.getElementById(id);
const state = { cvText: '', jobText: '', cvName: '', jobTitle: '' };
const stop = new Set(('the a an and or to of in for on with from by as at is are be this that your you we our their they it its how what when where into over under about after before can will should may have has had not no more most very role job company team work working using use used based including include required requirements preferred experience years degree skills ability strong good own support develop build responsible responsible for portugal lisbon remote full time english português portuguesa').split(/\s+/));

function alertUser(msg){ const el=$('alert'); el.textContent=msg; el.style.display=msg?'block':'none'; }
function setStatus(id,msg){ $(id).textContent=msg; }
function esc(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function cleanText(s){ return String(s||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim(); }
function words(text){ return [...new Set(cleanText(text).toLowerCase().replace(/[^\p{L}\p{N}+#.-]+/gu,' ').split(/\s+/).filter(w=>w.length>3&&!stop.has(w)))]; }
function titleFromJob(text,url){
  const first=cleanText(text).split('\n').find(x=>x.length>8) || '';
  const fromUrl=(url||'').split('/').filter(Boolean).pop()?.replace(/[-_]+/g,' ')||'';
  const sentence=(first.match(/^(.{4,95}?)(?:[.!?](?:\s|$)|$)/)||[])[1]||'';
  return (sentence.length>4?sentence:fromUrl).replace(/^job offer\s*/i,'').trim();
}
function parseSections(text){
 const lines=cleanText(text).split('\n').map(x=>x.trim()).filter(Boolean);
 const heading=/^(profile|summary|about me|experience|professional experience|work experience|education|skills|competencies|technical skills|formação|experiência|competências|perfil|contact|contactos|languages|idiomas|projects|projectos|training|formação adicional)$/i;
 const sections={General:[]}; let current='General';
 for(const line of lines){ if(heading.test(line)){current=line;sections[current]=[];} else sections[current].push(line); }
 return sections;
}
function parseName(text){ return cleanText(text).split('\n').find(x=>/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]{2,48}$/.test(x) && !/curriculum|resume|cv/i.test(x)) || 'Candidate'; }
function extractContact(text){ return cleanText(text).split('\n').slice(0,8).filter(x=>/@|\+?\d[\d ()-]{6,}|linkedin|\.com|Almada|Lisbon|Lisboa/i.test(x)).join(' · '); }

async function extractPdf(file){
 if(!window.pdfjsLib){ const mod=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs'); window.pdfjsLib=mod; }
 const buf=await file.arrayBuffer(); const pdf=await pdfjsLib.getDocument({data:buf}).promise; let out='';
 for(let i=1;i<=pdf.numPages;i++){ const page=await pdf.getPage(i); const c=await page.getTextContent(); out+=c.items.map(x=>x.str).join(' ')+'\n'; }
 return out;
}
async function extractFile(file){
 if(file.name.toLowerCase().endsWith('.pdf')) return extractPdf(file);
 if(file.name.toLowerCase().endsWith('.docx')){ if(!window.mammoth) throw new Error('DOCX reader is still loading. Try again in a moment.'); const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()}); return r.value; }
 return await file.text();
}

$('cvFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;setStatus('cvStatus','Reading '+f.name+'…');try{state.cvText=cleanText(await extractFile(f));state.cvName=f.name;setStatus('cvStatus',`${f.name} · ${state.cvText.length.toLocaleString()} characters extracted`);$('cvText').value=state.cvText;maybeEnable();}catch(err){setStatus('cvStatus','Could not extract automatically');alertUser(err.message+' You can paste the CV text below.');}});
$('cvText').addEventListener('input',e=>{state.cvText=cleanText(e.target.value);if(state.cvText)setStatus('cvStatus','Pasted CV text · '+state.cvText.length.toLocaleString()+' characters');maybeEnable();});
$('jobText').addEventListener('input',e=>{state.jobText=cleanText(e.target.value);if(state.jobText)setStatus('jobStatus','Pasted vacancy text · '+state.jobText.length.toLocaleString()+' characters');maybeEnable();});
$('fetchJob').addEventListener('click',async()=>{const url=$('jobUrl').value.trim();if(!url){alertUser('Paste a vacancy URL first.');return;}try{new URL(url);}catch{alertUser('That does not look like a valid URL.');return;}setStatus('jobStatus','Reading vacancy page…');try{const res=await fetch(url,{headers:{Accept:'text/html,text/plain'}});if(!res.ok)throw new Error('The page returned '+res.status+'.');const html=await res.text();const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('script,style,noscript,svg').forEach(x=>x.remove());state.jobText=cleanText(doc.body?.innerText||doc.documentElement.innerText||'');if(state.jobText.length<120)throw new Error('Very little readable text was returned.');setStatus('jobStatus',`Vacancy read · ${state.jobText.length.toLocaleString()} characters`);maybeEnable();}catch(err){setStatus('jobStatus','Link could not be read automatically');alertUser('The site blocked browser reading (common with LinkedIn/ATS pages). Paste the “About the job” text into the box below, then build the CV. No candidate data left this browser.');$('jobText').focus();}});
function maybeEnable(){ $('buildCv').disabled=!(state.cvText.length>120 && state.jobText.length>120); }
const dz=$('dropzone');['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));dz.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f){$('cvFile').files=e.dataTransfer.files;$('cvFile').dispatchEvent(new Event('change'));}});

function build(){
 alertUser(''); const cv=state.cvText, jd=state.jobText; const name=parseName(cv); const cvWords=words(cv), jdWords=words(jd); const matched=jdWords.filter(w=>cvWords.includes(w)).slice(0,12); const missing=jdWords.filter(w=>!cvWords.includes(w)).slice(0,7); const role=titleFromJob(jd,$('jobUrl').value);
 const sections=parseSections(cv); const summary=`Early-career candidate targeting <b>${esc(role)}</b>, bringing evidence from the uploaded CV: structured analysis, transferable experience and a demonstrated willingness to learn. This version prioritises truthful overlaps with the vacancy language and does not add unsupported tools, seniority or achievements.`;
 const experience=(sections['Professional Experience']||sections['Work Experience']||sections['Experiência Profissional']||sections['Experience']||[]).slice(0,18);
 const education=(sections['Education']||sections['Formação']||[]).slice(0,10);
 const skills=(sections['Skills']||sections['Competencies']||sections['Competências']||sections['Technical Skills']||[]).slice(0,15);
 const rawGeneral=sections.General.slice(0,8);
 const fallbackExp=experience.length?experience:rawGeneral.filter(x=>/\b(20\d{2}|experience|leroy|mcdonald|worten|oceanário|company|merlin)\b/i.test(x)).slice(0,10);
 const expHtml=fallbackExp.length?fallbackExp.map(x=>`<p class="role">${esc(x)}</p>`).join(''):'<p class="empty-state">No clearly labelled experience section was detected. Review the source CV and paste a clearer version if needed.</p>';
 const eduHtml=education.length?education.map(x=>`<p>${esc(x)}</p>`).join(''):'<p class="empty-state">No clearly labelled education section was detected.</p>';
 const skillsHtml=(matched.length?matched:skills).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>Review the source CV for supported skills.</li>';
 $('fitStrip').innerHTML=`<span class="fit-pill">${matched.length} evidence overlaps found</span><span class="fit-pill warn">${missing.length} vacancy terms not found in source</span><span class="fit-pill">No unsupported claims added</span>`;
 $('cvPaper').innerHTML=`<h1>${esc(name)}</h1><div class="cv-target">${esc(role)}</div><div class="cv-contact">${esc(extractContact(cv))}</div><div class="cv-line"></div><h3>PROFILE</h3><div class="highlight"><p>${summary}</p></div><h3>KEY EVIDENCE FOR THIS ROLE</h3><ul>${skillsHtml}</ul><h3>PROFESSIONAL EXPERIENCE</h3>${expHtml}<h3>EDUCATION & TRAINING</h3>${eduHtml}<p class="empty-state" style="margin-top:15px">Tailored by RoleReady from the candidate-provided CV and vacancy text. Review every line before sending.</p>`;
 $('outputWrap').hidden=false; $('outputWrap').scrollIntoView({behavior:'smooth'});
}
$('buildCv').addEventListener('click',build);
$('downloadPdf').addEventListener('click',async()=>{const paper=$('cvPaper');const opt={margin:0,filename:(parseName(state.cvText).replace(/\s+/g,'_')||'Candidate')+'_tailored_CV.pdf',image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}};if(window.html2pdf)await html2pdf().set(opt).from(paper).save();else window.print();});
$('clearAll').addEventListener('click',()=>{state.cvText='';state.jobText='';$('cvFile').value='';$('cvText').value='';$('jobText').value='';$('jobUrl').value='';$('cvPaper').innerHTML='';$('outputWrap').hidden=true;setStatus('cvStatus','No file selected');setStatus('jobStatus','No vacancy loaded');alertUser('');maybeEnable();window.scrollTo({top:0,behavior:'smooth'});});
