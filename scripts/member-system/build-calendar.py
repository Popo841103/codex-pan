"""Add calendar and an admin page using the existing page shell and auth dialog."""
from pathlib import Path
from lxml import html,etree
R=Path(__file__).resolve().parents[2]
tree=html.fromstring((R/'community.html').read_bytes())
hero=tree.xpath('//section[contains(@class,"community-hero")]')[0]
section=etree.Element('section',id='community-calendar',attrib={'class':'section','aria-label':'Activity calendar'})
hero.addnext(section)
head=tree.xpath('//head')[0];etree.SubElement(head,'link',rel='stylesheet',href='calendar.css?v=20261027-calendar1')
etree.SubElement(tree.xpath('//body')[0],'script',src='calendar.js?v=20261027-calendar1')
for a in tree.xpath('//a[@href="#builders"]'):a.set('href','#community-calendar')
a=etree.SubElement(section,'a',href='community-admin.html',attrib={'data-en':'Activity management','data-zh':'活动管理','data-ms':'Pengurusan aktiviti','class':'text-link'});a.text='Activity management'
(R/'community.html').write_text('<!doctype html>\n'+html.tostring(tree,encoding='unicode'))
# Keep the header, language tools and existing member dialog; replace only main content.
admin=html.fromstring(html.tostring(tree))
main=admin.xpath('//main')[0];main.clear();main.set('class','section')
a=etree.SubElement(main,'a',href='community.html',attrib={'data-en':'Back to community','data-zh':'返回社区','data-ms':'Kembali ke komuniti'});a.text='Back to community'
etree.SubElement(main,'section',id='community-calendar',attrib={'data-admin':'true','aria-label':'Activity management'})
controls=etree.SubElement(main,'div',hidden='hidden')
for id in ['member-open-mine','member-load-events']:
 etree.SubElement(controls,'button',id=id,type='button')
etree.SubElement(controls,'div',id='member-public-list')
admin.xpath('//title')[0].text='CO-HUB · Activity management'
etree.SubElement(admin.xpath('//head')[0],'meta',name='robots',content='noindex,nofollow')
(R/'community-admin.html').write_text('<!doctype html>\n'+html.tostring(admin,encoding='unicode'))
