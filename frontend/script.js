document.addEventListener('DOMContentLoaded',()=>{

  const messagesBox=document.getElementById('messages')
  const diffBox=document.getElementById('difficulty-buttons')
  const quoteBlock=document.querySelector('.quote')
  const userInput=document.getElementById('user-input')
  const sendBtn=document.getElementById('send-btn')

  let selectedTopic=null

  function hideQuote(){if(quoteBlock)quoteBlock.style.display='none'}

  function showMessage(text,sender='bot'){
    const msg=document.createElement('div')
    msg.className=`message ${sender}`
    msg.textContent=text
    messagesBox.appendChild(msg)
    messagesBox.scrollTop=messagesBox.scrollHeight
  }

  document.querySelectorAll('.sidebar li').forEach(li=>{
    li.addEventListener('click',()=>{
      hideQuote()
      document.querySelectorAll('.sidebar li').forEach(el=>el.classList.remove('active-topic'))
      li.classList.add('active-topic')
      selectedTopic=li.textContent.trim().toLowerCase().replace(/\s+/g,'_')
      showMessage(`Topic chosen: ${li.textContent}. Pick a difficulty 👇`,'bot')
      diffBox.style.display='flex'
    })
  })

  window.chooseDifficulty=function(level){
    hideQuote()
    if(!selectedTopic){
      showMessage('Please choose a topic first. 👈','bot')
      return
    }
    diffBox.style.display='none'
    showMessage(`Generating a ${level} task for ${selectedTopic}…`,'bot')
    fetch(`/generate_task?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(level)}`)
      .then(async res=>{
        const contentType=res.headers.get('content-type')||''
        const task=contentType.includes('application/json')?(await res.json()).task:await res.text()
        showMessage(`📝 Task:\n${task}`,'bot')
      })
      .catch(err=>{
        console.error(err)
        showMessage('⚠️ Could not fetch a task. Try again later.','bot')
      })
  }

  function sendMessage(){
    const msg=userInput.value.trim()
    if(!msg)return
    hideQuote()
    showMessage(msg,'user')
    userInput.value=''
  }

  userInput.addEventListener('keydown',e=>e.key==='Enter'&&sendMessage())
  sendBtn.addEventListener('click',sendMessage)

})
