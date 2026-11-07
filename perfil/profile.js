(() => {
  'use strict';
  try {
    const code=location.hash.slice(1);
    if(!code||code.length>1500||!/^[A-Za-z0-9_-]+$/.test(code))return;
    let base=code.replace(/-/g,'+').replace(/_/g,'/');base+='='.repeat((4-base.length%4)%4);
    const bytes=Uint8Array.from(atob(base),c=>c.charCodeAt(0));const p=JSON.parse(new TextDecoder().decode(bytes));
    if(!Array.isArray(p)||p[0]!==1||p.length!==6||!p.slice(1).every(v=>typeof v==='string')||p[1].length>40||p[3].length>24||!/^[0-9]{10,13}$/.test(p[4]))return;
    const [_,name,species,tutor,phone,city]=p;
    document.title=name+' — Contato do tutor';document.getElementById('pet-name').textContent=name;document.getElementById('pet-species').textContent=species;
    const main=document.getElementById('profile-content');main.replaceChildren();
    const heading=document.createElement('h2');heading.textContent='Encontrou '+name+'?';main.append(heading);
    const intro=document.createElement('p');intro.className='muted';intro.textContent='Entre em contato com o tutor para ajudar este pet a voltar para casa.';main.append(intro);
    const list=document.createElement('dl');list.className='profile-details';for(const [title,value] of [['Tutor(a)',tutor],['Cidade',city||'Não informada'],['Telefone',phone]]){const group=document.createElement('div');const dt=document.createElement('dt');dt.textContent=title;const dd=document.createElement('dd');dd.textContent=value;group.append(dt,dd);list.append(group);}main.append(list);
    const dial=document.createElement('a');dial.className='btn primary';dial.href='tel:+'+(phone.length<=11?'55':'')+phone;dial.textContent='Ligar para o tutor';main.append(dial);
    const chat=document.createElement('a');chat.className='btn';chat.href='https://wa.me/'+(phone.length<=11?'55':'')+phone+'?text='+encodeURIComponent('Olá! Encontrei o perfil de '+name+' na identificação pet.');chat.target='_blank';chat.rel='noopener noreferrer';chat.textContent='Conversar no WhatsApp';main.append(chat);
    const note=document.createElement('p');note.className='field-note';note.style.marginTop='20px';note.textContent='Contato cadastrado na criação da tag. Se o número não responder, procure ajuda de uma clínica veterinária ou protetor local.';main.append(note);
  }catch(_){/* Mantém a mensagem de perfil inválido, sem expor conteúdo do link. */}
})();
