require 'rubygems'
require 'nokogiri'
require 'yajl'

doc = Nokogiri::HTML(open('o.html')) 

CLASS = {
  "deletion"  => 0,
  "insertion" => 1,
  "change" => 2,
  "move" => 3,
  "move-change" => 4,
  "unchanged" => 5
}

left = []
right = []
doc.css('.src pre').each { |s|
  src = left if s.search('a#leftstart').size > 0
  src = right if s.search('a#rightstart').size > 0
  s.children.each { |e|
    src.push e.inner_text if e.text?
    if e.elem?
      n = { }
      e.attributes.each { |a|
        n[:c] = CLASS[a[1].value] if a[0] == 'class'
        n[:i] = a[1].value.to_i if a[0] == 'tid'
        n[:s] = e.inner_text
      }
      src.push n if n[:c] && n[:s]
    end
  }
}
puts Yajl::Encoder.encode({:left => left, :right => right})
