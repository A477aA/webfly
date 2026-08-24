// webfly — служебные утилиты: освобождение ресурсов, пулы, буферы
// Подключается сразу после config.js

// ---- Освобождение GPU-ресурсов ----
// three.js не чистит геометрию/материалы автоматически: без dispose() каждая
// удалённая пуля и частица оставляют буфер в видеопамяти.
function disposeObject(obj){
  if(!obj)return;
  obj.traverse(o=>{
    if(o.geometry && !o.geometry.__shared) o.geometry.dispose();
    const m=o.material;
    if(m){ if(Array.isArray(m)) m.forEach(x=>x&&!x.__shared&&x.dispose());
           else if(!m.__shared) m.dispose(); }
  });
}
// удалить из сцены и освободить память
function removeObject(obj){
  if(!obj)return;
  if(obj.parent)obj.parent.remove(obj);
  disposeObject(obj);
}
// пометить материал/геометрию как общий — такие не освобождаем
function shared(x){ if(x)x.__shared=true; return x; }

// ---- Переиспользуемые векторы (чтобы не аллоцировать в горячем цикле) ----
const TMP={
  a:new THREE.Vector3(), b:new THREE.Vector3(), c:new THREE.Vector3(),
  d:new THREE.Vector3(), e:new THREE.Vector3(), f:new THREE.Vector3(),
  q:new THREE.Quaternion()
};

// ---- Кэш DOM-элементов: getElementById в кадре стоит дорого ----
const DOM={};
function el(id){ let e=DOM[id]; if(e===undefined){ e=document.getElementById(id); DOM[id]=e; } return e; }

// ---- Компактизация массивов сущностей ----
// Мёртвые записи никогда не удалялись — за долгий бой массивы росли бесконечно,
// и каждый кадр мы перебирали сотни трупов.
function compactEntities(){
  const alive=o=>o.alive;
  if(enemies.length>24) enemies=enemies.filter(alive);
  if(allies.length>12)  allies =allies.filter(alive);
  if(aaa.length>12)     aaa    =aaa.filter(alive);
  if(targets.length>60) targets=targets.filter(alive);
}

// список враждебных целей без аллокации нового массива каждый кадр
const _hostiles=[];
function allHostiles(){
  _hostiles.length=0;
  for(let i=0;i<enemies.length;i++)_hostiles.push(enemies[i]);
  for(let i=0;i<aaa.length;i++)_hostiles.push(aaa[i]);
  return _hostiles;
}
