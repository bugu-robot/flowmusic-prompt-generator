import { describe, expect, it } from 'vitest';
import { recommendConfiguration } from '../engine/recommendation-engine';
import { synchronizeChoiceButtons } from './chip-controller';
import { flowOmittedOptions } from '../engine/flow-overflow';
function chip(group:string,value:string) {
  const classes=new Set<string>(), attrs:Record<string,string>={};
  return {dataset:{group,value},disabled:false,title:'',classes,attrs,
    classList:{toggle(name:string,on:boolean){if(on)classes.add(name);else classes.delete(name);}},
    setAttribute(name:string,v:string){attrs[name]=v;},removeAttribute(name:string){if(name==='title')this.title='';}};
}
function dom(buttons: ReturnType<typeof chip>[], group:string) {
  const note={dataset:{limitGroup:group},textContent:''};
  const root={querySelectorAll(selector:string){return selector==='[data-action="toggle-chip"]'?buttons:[note];}};
  return {root:root as unknown as Pick<ParentNode,'querySelectorAll'>,note};
}
describe('DOM chip controller regressions',()=>{
  it('deselect immediately enables Flow Feel again and updates aria',()=>{
    const cfg=recommendConfiguration('cozy-jazz');cfg.moodIds=['cozy','warm','peaceful','nostalgic'];
    const a=chip('moodIds','cozy'),b=chip('moodIds','dreamy'),{root,note}=dom([a,b],'moodIds');
    synchronizeChoiceButtons(root,cfg,'flow');
    expect(a.attrs['aria-pressed']).toBe('true');expect(b.disabled).toBe(true);
    cfg.moodIds.splice(1,1);synchronizeChoiceButtons(root,cfg,'flow');
    expect(b.disabled).toBe(false);expect(note.textContent).toContain('3/4');
    cfg.moodIds.push('dreamy');synchronizeChoiceButtons(root,cfg,'suno');
    expect(b.classes.has('is-selected')).toBe(true);expect(note.textContent).toBe('');
  });
  it('provider switch preserves all six moods, while Flow reports real omissions',()=>{
    const cfg=recommendConfiguration('cozy-jazz');
    cfg.moodIds=['cozy','warm','peaceful','nostalgic','dreamy','playful'];
    const a=chip('moodIds','dreamy'),b=chip('moodIds','cheerful'),{root}=dom([a,b],'moodIds');
    synchronizeChoiceButtons(root,cfg,'suno');expect(b.disabled).toBe(false);
    synchronizeChoiceButtons(root,cfg,'flow');expect(a.disabled).toBe(false);expect(b.disabled).toBe(true);
    expect(flowOmittedOptions(cfg).find(x=>x.group==='Feel')?.omitted).toHaveLength(2);
    expect(cfg.moodIds).toHaveLength(6);
  });
  it('releases Recording traits/effects independently, including special bass features',()=>{
    const cfg=recommendConfiguration('slow-bossa');
    cfg.productionIds=['warm','acoustic','intimate','room','vintage','analog','polished','round-bass','smooth-highs'];
    const a=chip('productionIds','clean'),b=chip('productionIds','soft-transients'),c=chip('productionIds','round-bass'),{root}=dom([a,b,c],'productionIds');
    synchronizeChoiceButtons(root,cfg,'flow');
    expect(a.disabled).toBe(true);expect(b.disabled).toBe(true);expect(c.disabled).toBe(false);
    cfg.productionIds=cfg.productionIds.filter(x=>x!=='warm'&&x!=='room');
    synchronizeChoiceButtons(root,cfg,'flow');expect(a.disabled).toBe(false);expect(b.disabled).toBe(false);
  });
});
