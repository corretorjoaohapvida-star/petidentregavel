(() => {
  'use strict';
  const KEY='identidadepet.welcome.v1';
  let profile={name:'',goal:'identity',completed:false},step=0,context=null,opened=false;
  const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  try{const value=JSON.parse(localStorage.getItem(KEY)||'null');if(value&&typeof value.name==='string'){profile={name:value.name.trim().slice(0,40),goal:['identity','qr','health'].includes(value.goal)?value.goal:'identity',completed:value.completed===true};}}catch(_){}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(profile));return true;}catch(_){const message=document.getElementById('welcome-error');if(message)message.textContent='Seu navegador não permitiu salvar. Habilite o armazenamento e tente novamente.';return false;}}
  function dialog(){let el=document.getElementById('welcome-dialog');if(el)return el;el=document.createElement('dialog');el.id='welcome-dialog';el.className='welcome-dialog';el.setAttribute('aria-labelledby','welcome-title');el.addEventListener('cancel',event=>{if(!profile.completed)event.preventDefault();});document.body.append(el);return el;}
  function paint(){
    const el=dialog();
    const heading=['O cantinho dele começa com você.','Qual vai ser a primeira aventura?','Seu cantinho está pronto, '+escape(profile.name.split(' ')[0])+'.'];
    const bodies=[
      `<div class="welcome-mascot" aria-hidden="true">🐾<span>♡</span></div><p class="welcome-lead">Documentos, cuidados e pequenas conquistas.<br>Primeiro, como podemos chamar você?</p><form id="welcome-name-form"><label for="welcome-name">Seu nome ou apelido</label><input id="welcome-name" name="name" value="${escape(profile.name)}" autocomplete="given-name" maxlength="40" required placeholder="Ex.: Mariana" autofocus><p class="welcome-local">Salvo só neste navegador. Sem criar conta.</p><p id="welcome-error" role="status"></p><button class="btn primary welcome-next" type="submit">Esse cantinho é meu →</button></form>`,
      `<p class="welcome-lead">${escape(profile.name.split(' ')[0])}, escolha por onde quer começar.<br>Você pode explorar tudo depois.</p><div class="welcome-choices">${[['identity','▤','Criar a identidade','Dar nome, foto e sobrenome à história dele.'],['qr','⌘','Preparar a tag QR','Conectar a identificação ao seu contato.'],['health','♡','Organizar os cuidados','Guardar vacinas e datas importantes.']].map(([value,mark,title,sub])=>`<button class="welcome-choice ${profile.goal===value?'chosen':''}" data-goal="${value}" aria-pressed="${profile.goal===value}"><span class="choice-symbol" aria-hidden="true">${mark}</span><span><strong>${title}</strong><small>${sub}</small></span><span class="choice-check" aria-hidden="true">${profile.goal===value?'✓':'○'}</span></button>`).join('')}</div><p id="welcome-error" role="status"></p><button class="btn primary welcome-next" data-welcome="next">Escolher minha missão →</button><button class="welcome-back" data-welcome="back">← Voltar</button>`,
      `<div class="welcome-trophy" aria-hidden="true">✦<i>♡</i></div><span class="welcome-award">PRIMEIRA CONQUISTA · +25 PONTOS</span><p class="welcome-lead">Você desbloqueou o selo <strong>Tutor de coração.</strong><br>Agora é a vez de apresentar o seu pet.</p><div class="welcome-mission"><span>MISSÃO 01</span><strong>Adicionar o primeiro pet</strong><small>Nome + dados do tutor = mais 50 pontos.</small></div><p class="welcome-local">Seu progresso acompanha o que você realmente faz no app.</p><p id="welcome-error" role="status"></p><button class="btn primary welcome-next" data-welcome="finish">${context?.state?.pets?.length?'Entrar no meu cantinho':'Vamos conhecer meu pet'} →</button>`
    ];
    el.innerHTML=`<div class="welcome-onboard-top"><span>SEU CANTINHO PET</span><span>${step+1} / 3</span></div><div class="welcome-step-dots" aria-label="Etapa ${step+1} de 3">${[0,1,2].map(n=>`<i class="${n<=step?'on':''}"></i>`).join('')}</div><h2 id="welcome-title">${heading[step]}</h2>${bodies[step]}`;
    if(!el.open)el.showModal();
    const input=el.querySelector('input');if(input)input.focus();else el.querySelector('button')?.focus();
    el.querySelector('form')?.addEventListener('submit',event=>{event.preventDefault();const name=String(new FormData(event.target).get('name')||'').replace(/[\u0000-\u001f]/g,'').trim().slice(0,40);if(!name)return;profile.name=name;if(save()){step=1;paint();}});
  }
  function open(){opened=true;step=0;paint();}
  function enhance(data){
    context=data;
    const initials=document.querySelector('.avatar-button');if(initials&&profile.name)initials.textContent=profile.name.slice(0,1).toUpperCase();
    if(data.page==='home'){
      const state=data.state,pets=state.pets||[],hasPhoto=pets.some(p=>p.photo),hasDocument=Object.values(state.downloads||{}).some(d=>Object.keys(d).length>0);
      const achievements=[['Tutor de coração',profile.completed,25],['Pet na família',pets.length>0,50],['Foto favorita',hasPhoto,25],['Primeiro documento',hasDocument,50],['Backup guardado',Boolean(state.backedUpAt),25]];
      const points=achievements.reduce((n,entry)=>n+(entry[1]?entry[2]:0),0),total=175,done=achievements.filter(a=>a[1]).length;
      const level=points>=150?'Família de carteirinha':points>=75?'Tutor cuidadoso':'Tutor de coração';
      const next=!pets.length?['add-pet','Conhecer meu pet']:!hasPhoto?['edit-pet','Escolher a foto dele']:!hasDocument?['go-documents','Criar o primeiro documento']:!state.backedUpAt?['export-backup','Guardar meu backup']:['go-documents','Ver meus documentos'];
      const card=document.createElement('section');card.className='welcome-progress';card.setAttribute('aria-label','Suas conquistas');
      card.innerHTML=`<div class="welcome-progress-heading"><span class="welcome-level-star" aria-hidden="true">✦</span><div><span class="eyebrow">${escape(profile.name.split(' ')[0]||'Tutor')}, SUA JORNADA COMEÇOU</span><h2>${level}</h2></div><div class="welcome-points"><strong>${points}</strong><span>pontos</span></div></div><div class="welcome-xp-track" role="progressbar" aria-label="Pontos da jornada" aria-valuenow="${points}" aria-valuemin="0" aria-valuemax="${total}"><i style="width:${points/total*100}%"></i></div><div class="welcome-badges">${achievements.map(([title,unlocked,value])=>`<span class="welcome-badge ${unlocked?'unlocked':''}" title="${unlocked?'Conquistado':'Ainda não conquistado'} · ${value} pontos"><i aria-hidden="true">${unlocked?'✓':'○'}</i>${title}</span>`).join('')}</div><div class="welcome-progress-bottom"><span>${done} de 5 conquistas · no seu ritmo, com carinho.</span><button class="text-button" data-action="${next[0]}">${next[1]} →</button></div>`;
      const top=document.querySelector('#main .page-top');if(top)top.insertAdjacentElement('afterend',card);
      const greeting=document.querySelector('#main .page-top h1');if(greeting&&profile.name)greeting.textContent='Olá, '+profile.name.split(' ')[0]+' ☀';
    }
    if(data.page==='settings'){
      const card=document.createElement('section');card.className='panel welcome-settings';card.innerHTML=`<span class="eyebrow">SEU PERFIL NESTE DISPOSITIVO</span><h2>Como chamamos você</h2><p>${escape(profile.name||'Seu nome ainda não foi escolhido.')}</p><button class="btn" data-welcome="edit">Alterar nome e apresentação</button>`;document.querySelector('.settings-grid')?.prepend(card);
    }
    if(!profile.completed&&!opened)open();
  }
  document.addEventListener('click',event=>{
    const goal=event.target.closest('[data-goal]');if(goal){profile.goal=goal.dataset.goal;paint();return;}
    const action=event.target.closest('[data-welcome]')?.dataset.welcome;
    if(action==='edit')open();
    if(action==='back'){step=Math.max(0,step-1);paint();}
    if(action==='next'){if(save()){step=2;paint();}}
    if(action==='finish'){
      profile.completed=true;if(!save()){profile.completed=false;return;}dialog().close();
      window.dispatchEvent(new CustomEvent('pet-welcome-complete'));
      const page=profile.goal==='health'?'health':profile.goal==='qr'?'qr':'pets';
      if(context?.state?.pets?.length)document.querySelector(`[data-page="${page}"]`)?.click();
      else document.querySelector('#main [data-action="add-pet"]')?.click();
    }
  });
  window.PetWelcome={get name(){return profile.name;},enhance,clear(){profile={name:'',goal:'identity',completed:false};opened=false;try{localStorage.removeItem(KEY);}catch(_){}},exportProfile(){return {...profile};},restore(value){if(value&&typeof value.name==='string'){profile={name:value.name.trim().slice(0,40),goal:['identity','qr','health'].includes(value.goal)?value.goal:'identity',completed:value.completed===true};save();}}};
})();
