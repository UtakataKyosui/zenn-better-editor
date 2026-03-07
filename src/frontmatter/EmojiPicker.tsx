import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const EMOJIS: { emoji: string; keywords: string }[] = [
  // Tech / Dev
  { emoji: '🚀', keywords: 'rocket launch deploy start' },
  { emoji: '💻', keywords: 'laptop computer dev tech' },
  { emoji: '🖥️', keywords: 'desktop monitor screen' },
  { emoji: '📱', keywords: 'phone mobile smartphone' },
  { emoji: '⌨️', keywords: 'keyboard type input' },
  { emoji: '🖱️', keywords: 'mouse cursor click' },
  { emoji: '💾', keywords: 'save disk floppy storage' },
  { emoji: '💿', keywords: 'cd disc media' },
  { emoji: '📀', keywords: 'dvd disc media' },
  { emoji: '📡', keywords: 'satellite antenna network' },
  { emoji: '🔌', keywords: 'plug power connect' },
  { emoji: '🔋', keywords: 'battery power energy' },
  { emoji: '🔧', keywords: 'wrench tool fix repair' },
  { emoji: '🔨', keywords: 'hammer build' },
  { emoji: '⚙️', keywords: 'gear settings config' },
  { emoji: '🪛', keywords: 'screwdriver tool fix' },
  { emoji: '🪜', keywords: 'ladder step climb' },
  { emoji: '🤖', keywords: 'robot ai automation' },
  { emoji: '👾', keywords: 'alien game bug' },
  { emoji: '🐛', keywords: 'bug error fix debug' },
  { emoji: '🔐', keywords: 'lock security auth' },
  { emoji: '🔒', keywords: 'lock closed secure' },
  { emoji: '🔓', keywords: 'lock open unlock' },
  { emoji: '🔑', keywords: 'key auth login' },
  { emoji: '🗝️', keywords: 'old key secret' },
  { emoji: '🛡️', keywords: 'shield security protect' },
  { emoji: '☁️', keywords: 'cloud server infra aws' },
  { emoji: '⛅', keywords: 'cloud partly sunny' },
  { emoji: '🌐', keywords: 'web globe internet network' },
  { emoji: '📊', keywords: 'chart graph data analytics' },
  { emoji: '📈', keywords: 'chart up growth trend' },
  { emoji: '📉', keywords: 'chart down decrease' },
  { emoji: '🗄️', keywords: 'database server storage' },
  { emoji: '🖨️', keywords: 'printer output' },
  { emoji: '📠', keywords: 'fax machine' },
  { emoji: '📟', keywords: 'pager device' },
  { emoji: '☎️', keywords: 'telephone call' },
  { emoji: '📞', keywords: 'phone call' },
  { emoji: '🔭', keywords: 'telescope research explore' },
  { emoji: '🧪', keywords: 'test lab experiment' },
  { emoji: '🔬', keywords: 'microscope research science' },
  { emoji: '⚗️', keywords: 'chemistry science experiment' },
  { emoji: '🧬', keywords: 'dna gene biology' },
  { emoji: '🧫', keywords: 'petri dish culture lab' },
  { emoji: '🧲', keywords: 'magnet attract' },
  { emoji: '💡', keywords: 'idea tip light bulb' },
  { emoji: '🔦', keywords: 'flashlight torch light' },
  { emoji: '🕯️', keywords: 'candle light' },
  { emoji: '⚡', keywords: 'lightning fast speed electric' },
  { emoji: '🛠️', keywords: 'tools dev build' },
  { emoji: '⚒️', keywords: 'hammer pick tools' },
  { emoji: '🪚', keywords: 'saw tool cut' },
  { emoji: '🧰', keywords: 'toolbox kit' },
  { emoji: '🗜️', keywords: 'clamp compress' },
  // Writing / Content
  { emoji: '📝', keywords: 'note write memo edit' },
  { emoji: '✏️', keywords: 'pencil write edit draft' },
  { emoji: '🖊️', keywords: 'pen write' },
  { emoji: '🖋️', keywords: 'fountain pen elegant write' },
  { emoji: '🖌️', keywords: 'paintbrush art design' },
  { emoji: '📚', keywords: 'books study learn docs' },
  { emoji: '📖', keywords: 'book read docs guide' },
  { emoji: '📗', keywords: 'green book' },
  { emoji: '📘', keywords: 'blue book' },
  { emoji: '📙', keywords: 'orange book' },
  { emoji: '📕', keywords: 'red book' },
  { emoji: '📓', keywords: 'notebook' },
  { emoji: '📔', keywords: 'notebook decorated' },
  { emoji: '📒', keywords: 'ledger notebook' },
  { emoji: '📃', keywords: 'page document' },
  { emoji: '📄', keywords: 'document file' },
  { emoji: '📑', keywords: 'bookmark tabs' },
  { emoji: '📋', keywords: 'clipboard list docs' },
  { emoji: '📌', keywords: 'pin point memo' },
  { emoji: '📍', keywords: 'pin location' },
  { emoji: '🗒️', keywords: 'notepad memo notes' },
  { emoji: '🗓️', keywords: 'calendar schedule plan' },
  { emoji: '📅', keywords: 'calendar date' },
  { emoji: '📆', keywords: 'calendar tearoff' },
  { emoji: '🗺️', keywords: 'map guide overview' },
  { emoji: '🗂️', keywords: 'folder index organize' },
  { emoji: '📁', keywords: 'folder directory' },
  { emoji: '📂', keywords: 'folder open' },
  { emoji: '🗃️', keywords: 'card file box archive' },
  { emoji: '🗑️', keywords: 'trash delete remove' },
  { emoji: '🎯', keywords: 'target goal aim focus' },
  { emoji: '📦', keywords: 'package box release' },
  { emoji: '📫', keywords: 'mailbox letter' },
  { emoji: '📬', keywords: 'mailbox open mail' },
  { emoji: '📮', keywords: 'postbox send' },
  { emoji: '🎁', keywords: 'gift present feature' },
  { emoji: '🏷️', keywords: 'label tag' },
  // Positive / Celebration
  { emoji: '🎉', keywords: 'party celebrate tada release' },
  { emoji: '✨', keywords: 'sparkle new feature shine' },
  { emoji: '🔥', keywords: 'fire hot trending popular' },
  { emoji: '🌟', keywords: 'star awesome great' },
  { emoji: '💫', keywords: 'dizzy star spin' },
  { emoji: '⭐', keywords: 'star favorite good' },
  { emoji: '🌠', keywords: 'shooting star wish' },
  { emoji: '💥', keywords: 'boom explosion' },
  { emoji: '💢', keywords: 'anger symbol' },
  { emoji: '💪', keywords: 'muscle strong power' },
  { emoji: '🙌', keywords: 'hands celebrate praise' },
  { emoji: '👏', keywords: 'clap applause good' },
  { emoji: '🤝', keywords: 'handshake deal partner' },
  { emoji: '👍', keywords: 'thumbs up good like' },
  { emoji: '👎', keywords: 'thumbs down bad dislike' },
  { emoji: '✌️', keywords: 'peace victory two' },
  { emoji: '🤞', keywords: 'fingers crossed hope luck' },
  { emoji: '🤟', keywords: 'love you hand' },
  { emoji: '🤙', keywords: 'call me shaka' },
  { emoji: '👌', keywords: 'ok perfect good' },
  { emoji: '🤌', keywords: 'pinched fingers italian' },
  { emoji: '🤏', keywords: 'pinching small little' },
  { emoji: '☝️', keywords: 'point up one' },
  { emoji: '👆', keywords: 'point up' },
  { emoji: '👇', keywords: 'point down' },
  { emoji: '👈', keywords: 'point left' },
  { emoji: '👉', keywords: 'point right' },
  { emoji: '🏆', keywords: 'trophy win best award' },
  { emoji: '🥇', keywords: 'gold medal first place' },
  { emoji: '🥈', keywords: 'silver medal second' },
  { emoji: '🥉', keywords: 'bronze medal third' },
  { emoji: '🎊', keywords: 'confetti party celebrate' },
  { emoji: '🎈', keywords: 'balloon party celebrate' },
  { emoji: '🎀', keywords: 'ribbon bow gift' },
  { emoji: '💯', keywords: 'perfect 100 complete' },
  { emoji: '✅', keywords: 'check done complete ok' },
  { emoji: '❎', keywords: 'x cross no' },
  { emoji: '🆕', keywords: 'new badge' },
  { emoji: '🆙', keywords: 'up update' },
  { emoji: '🆒', keywords: 'cool' },
  { emoji: '🆓', keywords: 'free' },
  { emoji: '🔝', keywords: 'top up arrow' },
  // Faces / People
  { emoji: '😀', keywords: 'smile happy grin' },
  { emoji: '😃', keywords: 'smile happy big eyes' },
  { emoji: '😄', keywords: 'laugh happy smile' },
  { emoji: '😁', keywords: 'grin beam' },
  { emoji: '😆', keywords: 'laugh squint' },
  { emoji: '😅', keywords: 'sweat smile nervous' },
  { emoji: '😂', keywords: 'laugh cry funny' },
  { emoji: '🤣', keywords: 'rolling laugh floor' },
  { emoji: '🥲', keywords: 'smile tear moved' },
  { emoji: '😊', keywords: 'smile happy blush' },
  { emoji: '😇', keywords: 'halo angel innocent' },
  { emoji: '🥰', keywords: 'love hearts face' },
  { emoji: '😍', keywords: 'love heart eyes' },
  { emoji: '🤩', keywords: 'star eyes amazing wow' },
  { emoji: '😘', keywords: 'kiss blowing' },
  { emoji: '😗', keywords: 'kissing face' },
  { emoji: '😙', keywords: 'kissing smile' },
  { emoji: '😚', keywords: 'kissing closed eyes' },
  { emoji: '😋', keywords: 'yum delicious tasty' },
  { emoji: '😛', keywords: 'tongue out playful' },
  { emoji: '😜', keywords: 'tongue wink playful' },
  { emoji: '🤪', keywords: 'zany crazy' },
  { emoji: '😝', keywords: 'tongue squint' },
  { emoji: '🤑', keywords: 'money face dollar' },
  { emoji: '🤗', keywords: 'hug hugging' },
  { emoji: '🤭', keywords: 'hand over mouth oops' },
  { emoji: '🤫', keywords: 'shush quiet secret' },
  { emoji: '🤔', keywords: 'thinking hmm wonder' },
  { emoji: '🤐', keywords: 'zip mouth quiet' },
  { emoji: '🤨', keywords: 'raised eyebrow skeptical' },
  { emoji: '😐', keywords: 'neutral expressionless' },
  { emoji: '😑', keywords: 'expressionless' },
  { emoji: '😶', keywords: 'no mouth silent' },
  { emoji: '😏', keywords: 'smirk smug' },
  { emoji: '😒', keywords: 'unamused' },
  { emoji: '🙄', keywords: 'eye roll annoyed' },
  { emoji: '😬', keywords: 'grimace awkward' },
  { emoji: '🥴', keywords: 'woozy drunk dizzy' },
  { emoji: '😳', keywords: 'flushed embarrassed' },
  { emoji: '🤯', keywords: 'mind blown exploding' },
  { emoji: '😤', keywords: 'triumph steam nose' },
  { emoji: '😠', keywords: 'angry mad' },
  { emoji: '😡', keywords: 'rage pouting red' },
  { emoji: '🤬', keywords: 'cursing symbols angry' },
  { emoji: '😔', keywords: 'pensive sad' },
  { emoji: '😞', keywords: 'disappointed' },
  { emoji: '😢', keywords: 'cry sad tear' },
  { emoji: '😭', keywords: 'sob crying loudly' },
  { emoji: '🥺', keywords: 'pleading puppy eyes' },
  { emoji: '😰', keywords: 'anxious sweat cold' },
  { emoji: '😱', keywords: 'scream fear shock' },
  { emoji: '😨', keywords: 'fearful scared' },
  { emoji: '😓', keywords: 'sweat down hard' },
  { emoji: '🤒', keywords: 'sick thermometer ill' },
  { emoji: '🤕', keywords: 'injured bandage hurt' },
  { emoji: '🤢', keywords: 'nauseated sick' },
  { emoji: '🤧', keywords: 'sneeze sick' },
  { emoji: '🥵', keywords: 'hot face sweat' },
  { emoji: '🥶', keywords: 'cold face frozen' },
  { emoji: '😵', keywords: 'dizzy eyes spiral' },
  { emoji: '🫠', keywords: 'melting face' },
  { emoji: '🥳', keywords: 'party celebrate hat' },
  { emoji: '😎', keywords: 'cool sunglasses' },
  { emoji: '🤓', keywords: 'nerd geek glasses' },
  { emoji: '🧐', keywords: 'monocle think inspect' },
  { emoji: '😈', keywords: 'devil smiling evil' },
  { emoji: '👿', keywords: 'devil angry evil' },
  { emoji: '💀', keywords: 'skull death' },
  { emoji: '☠️', keywords: 'skull crossbones' },
  { emoji: '👻', keywords: 'ghost spooky' },
  { emoji: '👽', keywords: 'alien space' },
  { emoji: '🤖', keywords: 'robot machine ai' },
  { emoji: '😺', keywords: 'cat smile happy' },
  { emoji: '😸', keywords: 'cat grin happy' },
  { emoji: '🙏', keywords: 'pray thanks please' },
  { emoji: '👋', keywords: 'wave hello hi bye' },
  { emoji: '🤚', keywords: 'raised hand back' },
  { emoji: '✋', keywords: 'raised hand stop' },
  { emoji: '🖐️', keywords: 'hand five fingers' },
  { emoji: '🖖', keywords: 'vulcan salute spock' },
  { emoji: '💁', keywords: 'information desk person' },
  { emoji: '🙋', keywords: 'raising hand' },
  { emoji: '🙆', keywords: 'ok gesture arms up' },
  { emoji: '🙅', keywords: 'no gesture arms crossed' },
  { emoji: '💆', keywords: 'massage relax' },
  { emoji: '💪', keywords: 'flexed biceps strong' },
  // Nature / Weather
  { emoji: '🌱', keywords: 'seedling grow new start' },
  { emoji: '🌲', keywords: 'tree evergreen forest' },
  { emoji: '🌳', keywords: 'tree deciduous' },
  { emoji: '🌴', keywords: 'palm tree tropical' },
  { emoji: '🌵', keywords: 'cactus desert' },
  { emoji: '🌿', keywords: 'herb green nature' },
  { emoji: '🍃', keywords: 'leaf green nature' },
  { emoji: '🍂', keywords: 'fallen leaf autumn' },
  { emoji: '🍁', keywords: 'maple leaf autumn fall' },
  { emoji: '🍀', keywords: 'clover lucky green' },
  { emoji: '🌺', keywords: 'flower blossom spring' },
  { emoji: '🌸', keywords: 'cherry blossom spring japan' },
  { emoji: '🌼', keywords: 'blossom yellow flower' },
  { emoji: '🌻', keywords: 'sunflower yellow sun' },
  { emoji: '🌹', keywords: 'rose love red' },
  { emoji: '🌷', keywords: 'tulip flower' },
  { emoji: '💐', keywords: 'bouquet flowers' },
  { emoji: '🍄', keywords: 'mushroom fungi' },
  { emoji: '🐚', keywords: 'shell ocean' },
  { emoji: '🪸', keywords: 'coral reef ocean' },
  { emoji: '🌊', keywords: 'wave ocean water' },
  { emoji: '🏔️', keywords: 'mountain snow peak' },
  { emoji: '⛰️', keywords: 'mountain summit peak' },
  { emoji: '🌋', keywords: 'volcano fire mountain' },
  { emoji: '🏕️', keywords: 'camping tent outdoor' },
  { emoji: '🏖️', keywords: 'beach umbrella sand' },
  { emoji: '🏜️', keywords: 'desert hot dry' },
  { emoji: '🏝️', keywords: 'island tropical' },
  { emoji: '🌅', keywords: 'sunrise morning dawn' },
  { emoji: '🌄', keywords: 'sunrise mountain' },
  { emoji: '🌇', keywords: 'city sunset evening' },
  { emoji: '🌆', keywords: 'city sunrise morning' },
  { emoji: '🌃', keywords: 'night city stars' },
  { emoji: '🌉', keywords: 'bridge night' },
  { emoji: '🌙', keywords: 'moon night dark' },
  { emoji: '🌛', keywords: 'moon crescent face' },
  { emoji: '🌝', keywords: 'full moon face' },
  { emoji: '🌕', keywords: 'full moon' },
  { emoji: '🌑', keywords: 'new moon dark' },
  { emoji: '⭐', keywords: 'star shine' },
  { emoji: '🌟', keywords: 'glowing star bright' },
  { emoji: '✨', keywords: 'sparkles shine' },
  { emoji: '☀️', keywords: 'sun sunny bright day' },
  { emoji: '🌤️', keywords: 'partly sunny cloud' },
  { emoji: '⛅', keywords: 'cloud sun' },
  { emoji: '🌥️', keywords: 'cloudy mostly' },
  { emoji: '☁️', keywords: 'cloud overcast' },
  { emoji: '🌦️', keywords: 'rain sun shower' },
  { emoji: '🌧️', keywords: 'rain cloud wet' },
  { emoji: '⛈️', keywords: 'thunder storm lightning' },
  { emoji: '🌩️', keywords: 'lightning bolt storm' },
  { emoji: '🌨️', keywords: 'snow cloud winter' },
  { emoji: '❄️', keywords: 'snow cold ice winter' },
  { emoji: '⛄', keywords: 'snowman winter' },
  { emoji: '🌬️', keywords: 'wind blow air' },
  { emoji: '🌪️', keywords: 'tornado twister' },
  { emoji: '🌈', keywords: 'rainbow colorful diversity' },
  { emoji: '☔', keywords: 'umbrella rain' },
  { emoji: '⚡', keywords: 'lightning bolt fast' },
  { emoji: '🌊', keywords: 'wave water' },
  { emoji: '🔥', keywords: 'fire flame hot' },
  // Animals
  { emoji: '🐶', keywords: 'dog puppy pet' },
  { emoji: '🐱', keywords: 'cat kitten pet' },
  { emoji: '🐭', keywords: 'mouse rodent' },
  { emoji: '🐹', keywords: 'hamster cute' },
  { emoji: '🐰', keywords: 'rabbit bunny' },
  { emoji: '🦊', keywords: 'fox clever orange' },
  { emoji: '🐻', keywords: 'bear brown' },
  { emoji: '🐼', keywords: 'panda cute bear' },
  { emoji: '🐨', keywords: 'koala australia' },
  { emoji: '🐯', keywords: 'tiger stripes' },
  { emoji: '🦁', keywords: 'lion king roar' },
  { emoji: '🐮', keywords: 'cow moo' },
  { emoji: '🐷', keywords: 'pig oink' },
  { emoji: '🐸', keywords: 'frog green' },
  { emoji: '🐵', keywords: 'monkey face' },
  { emoji: '🦆', keywords: 'duck bird' },
  { emoji: '🐔', keywords: 'chicken bird' },
  { emoji: '🐧', keywords: 'penguin linux cold' },
  { emoji: '🐦', keywords: 'bird tweet' },
  { emoji: '🦅', keywords: 'eagle bird powerful' },
  { emoji: '🦉', keywords: 'owl wise night' },
  { emoji: '🦇', keywords: 'bat dark night' },
  { emoji: '🐺', keywords: 'wolf howl' },
  { emoji: '🐗', keywords: 'boar pig wild' },
  { emoji: '🐴', keywords: 'horse stallion' },
  { emoji: '🦄', keywords: 'unicorn rainbow magic' },
  { emoji: '🐝', keywords: 'bee honey work' },
  { emoji: '🦋', keywords: 'butterfly transform change' },
  { emoji: '🐛', keywords: 'caterpillar bug worm' },
  { emoji: '🐌', keywords: 'snail slow' },
  { emoji: '🐞', keywords: 'ladybug bug' },
  { emoji: '🐜', keywords: 'ant small' },
  { emoji: '🦟', keywords: 'mosquito bug' },
  { emoji: '🦗', keywords: 'cricket insect' },
  { emoji: '🐢', keywords: 'turtle slow green' },
  { emoji: '🐍', keywords: 'snake python' },
  { emoji: '🦎', keywords: 'lizard reptile' },
  { emoji: '🦖', keywords: 'dinosaur trex' },
  { emoji: '🦕', keywords: 'dinosaur sauropod' },
  { emoji: '🐊', keywords: 'crocodile alligator' },
  { emoji: '🐙', keywords: 'octopus tentacles' },
  { emoji: '🦑', keywords: 'squid ocean' },
  { emoji: '🦈', keywords: 'shark attack fast' },
  { emoji: '🐬', keywords: 'dolphin smart ocean' },
  { emoji: '🐳', keywords: 'whale big ocean' },
  { emoji: '🦞', keywords: 'lobster red ocean' },
  { emoji: '🦀', keywords: 'crab ocean' },
  { emoji: '🐙', keywords: 'octopus clever' },
  { emoji: '🦁', keywords: 'lion brave king' },
  // Food & Drink
  { emoji: '🍎', keywords: 'apple fruit mac red' },
  { emoji: '🍊', keywords: 'orange fruit citrus' },
  { emoji: '🍋', keywords: 'lemon yellow sour' },
  { emoji: '🍇', keywords: 'grapes fruit wine' },
  { emoji: '🍓', keywords: 'strawberry red fruit' },
  { emoji: '🫐', keywords: 'blueberry fruit' },
  { emoji: '🍑', keywords: 'peach fruit soft' },
  { emoji: '🍒', keywords: 'cherry fruit red' },
  { emoji: '🥝', keywords: 'kiwi green fruit' },
  { emoji: '🍕', keywords: 'pizza food lunch' },
  { emoji: '🍔', keywords: 'burger food meal' },
  { emoji: '🌮', keywords: 'taco mexican food' },
  { emoji: '🌯', keywords: 'burrito wrap food' },
  { emoji: '🍜', keywords: 'ramen noodle japanese' },
  { emoji: '🍝', keywords: 'spaghetti pasta italian' },
  { emoji: '🍲', keywords: 'pot stew hot' },
  { emoji: '🫕', keywords: 'fondue pot cooking' },
  { emoji: '🍣', keywords: 'sushi japanese food' },
  { emoji: '🍱', keywords: 'bento box lunch japanese' },
  { emoji: '🍛', keywords: 'curry rice indian' },
  { emoji: '🍜', keywords: 'noodle bowl hot' },
  { emoji: '🍚', keywords: 'rice cooked bowl' },
  { emoji: '🍙', keywords: 'rice ball japanese' },
  { emoji: '🍘', keywords: 'rice cracker' },
  { emoji: '🍡', keywords: 'dango japanese sweet' },
  { emoji: '🧆', keywords: 'falafel food' },
  { emoji: '🥙', keywords: 'stuffed flatbread pita' },
  { emoji: '🍟', keywords: 'fries chips fast food' },
  { emoji: '🌭', keywords: 'hotdog sausage' },
  { emoji: '🧀', keywords: 'cheese yellow' },
  { emoji: '🥚', keywords: 'egg breakfast' },
  { emoji: '🍳', keywords: 'egg cooking fry' },
  { emoji: '🥞', keywords: 'pancakes breakfast' },
  { emoji: '🧇', keywords: 'waffle breakfast' },
  { emoji: '🥓', keywords: 'bacon breakfast' },
  { emoji: '🍗', keywords: 'chicken leg poultry' },
  { emoji: '🍖', keywords: 'meat bone' },
  { emoji: '🥩', keywords: 'steak meat' },
  { emoji: '🍰', keywords: 'cake slice birthday' },
  { emoji: '🎂', keywords: 'birthday cake celebrate' },
  { emoji: '🧁', keywords: 'cupcake sweet' },
  { emoji: '🍩', keywords: 'donut sweet' },
  { emoji: '🍪', keywords: 'cookie sweet baked' },
  { emoji: '🍫', keywords: 'chocolate bar sweet' },
  { emoji: '🍬', keywords: 'candy sweet' },
  { emoji: '🍭', keywords: 'lollipop candy sweet' },
  { emoji: '🍿', keywords: 'popcorn movie snack' },
  { emoji: '🧋', keywords: 'bubble tea boba' },
  { emoji: '☕', keywords: 'coffee morning cafe dev' },
  { emoji: '🍵', keywords: 'tea green japan' },
  { emoji: '🧃', keywords: 'juice drink box' },
  { emoji: '🥤', keywords: 'cup straw drink' },
  { emoji: '🍺', keywords: 'beer drink cheers' },
  { emoji: '🍻', keywords: 'beers cheers toast' },
  { emoji: '🥂', keywords: 'champagne toast celebrate' },
  { emoji: '🍷', keywords: 'wine red drink' },
  { emoji: '🍸', keywords: 'cocktail drink' },
  { emoji: '🥃', keywords: 'whiskey tumbler drink' },
  { emoji: '🍾', keywords: 'champagne bottle celebrate' },
  // Objects / Things
  { emoji: '💎', keywords: 'gem diamond ruby crystal' },
  { emoji: '💍', keywords: 'ring diamond wedding' },
  { emoji: '👑', keywords: 'crown king queen royal' },
  { emoji: '🎩', keywords: 'hat top formal' },
  { emoji: '🧢', keywords: 'cap hat baseball' },
  { emoji: '👒', keywords: 'hat womans' },
  { emoji: '⛑️', keywords: 'helmet rescue safety' },
  { emoji: '👓', keywords: 'glasses eyeglasses' },
  { emoji: '🕶️', keywords: 'sunglasses cool dark' },
  { emoji: '🥽', keywords: 'goggles lab safety' },
  { emoji: '🎵', keywords: 'music note audio sound' },
  { emoji: '🎶', keywords: 'music notes audio' },
  { emoji: '🎸', keywords: 'guitar music rock' },
  { emoji: '🎹', keywords: 'piano keyboard music' },
  { emoji: '🥁', keywords: 'drum music beat' },
  { emoji: '🎺', keywords: 'trumpet music' },
  { emoji: '🎻', keywords: 'violin music classical' },
  { emoji: '🎷', keywords: 'saxophone jazz music' },
  { emoji: '🎤', keywords: 'microphone sing karaoke' },
  { emoji: '🎧', keywords: 'headphones music listen' },
  { emoji: '📻', keywords: 'radio broadcast' },
  { emoji: '📺', keywords: 'tv television watch' },
  { emoji: '🎥', keywords: 'movie camera film' },
  { emoji: '📹', keywords: 'video camera record' },
  { emoji: '📷', keywords: 'camera photo image' },
  { emoji: '📸', keywords: 'camera flash photo' },
  { emoji: '🎨', keywords: 'art palette design color' },
  { emoji: '🖼️', keywords: 'painting art frame' },
  { emoji: '🎭', keywords: 'theater performing arts' },
  { emoji: '🎬', keywords: 'movie film video clap' },
  { emoji: '🎮', keywords: 'game controller play' },
  { emoji: '🕹️', keywords: 'joystick arcade game' },
  { emoji: '🎲', keywords: 'dice game random' },
  { emoji: '🃏', keywords: 'joker card game' },
  { emoji: '🎴', keywords: 'playing card flower' },
  { emoji: '♟️', keywords: 'chess pawn strategy' },
  { emoji: '🎯', keywords: 'bullseye target dart' },
  { emoji: '🎳', keywords: 'bowling sport' },
  { emoji: '⚽', keywords: 'soccer football sport' },
  { emoji: '🏀', keywords: 'basketball sport' },
  { emoji: '🏈', keywords: 'american football sport' },
  { emoji: '⚾', keywords: 'baseball sport' },
  { emoji: '🥎', keywords: 'softball sport' },
  { emoji: '🎾', keywords: 'tennis sport' },
  { emoji: '🏐', keywords: 'volleyball sport' },
  { emoji: '🏉', keywords: 'rugby sport' },
  { emoji: '🥏', keywords: 'frisbee disc sport' },
  { emoji: '🎱', keywords: 'billiards pool 8ball' },
  { emoji: '🏓', keywords: 'ping pong table tennis' },
  { emoji: '🏸', keywords: 'badminton sport' },
  { emoji: '🥊', keywords: 'boxing glove fight' },
  { emoji: '⛷️', keywords: 'skier ski winter' },
  { emoji: '🏂', keywords: 'snowboard winter' },
  { emoji: '🏊', keywords: 'swimmer pool' },
  { emoji: '🚴', keywords: 'cyclist bike' },
  { emoji: '🏠', keywords: 'house home local' },
  { emoji: '🏡', keywords: 'house garden home' },
  { emoji: '🏢', keywords: 'office building company' },
  { emoji: '🏣', keywords: 'post office building' },
  { emoji: '🏥', keywords: 'hospital medical' },
  { emoji: '🏦', keywords: 'bank money finance' },
  { emoji: '🏨', keywords: 'hotel stay' },
  { emoji: '🏫', keywords: 'school learn' },
  { emoji: '🏭', keywords: 'factory industry' },
  { emoji: '🏰', keywords: 'castle medieval' },
  { emoji: '🗼', keywords: 'tokyo tower japan' },
  { emoji: '🗽', keywords: 'statue liberty usa' },
  { emoji: '🗾', keywords: 'japan map' },
  { emoji: '🌍', keywords: 'earth world globe europe africa' },
  { emoji: '🌎', keywords: 'earth world globe americas' },
  { emoji: '🌏', keywords: 'earth world globe asia' },
  { emoji: '🚗', keywords: 'car drive travel' },
  { emoji: '🚕', keywords: 'taxi cab' },
  { emoji: '🚙', keywords: 'suv car' },
  { emoji: '🚌', keywords: 'bus transport' },
  { emoji: '🚎', keywords: 'trolleybus' },
  { emoji: '🏎️', keywords: 'racing car fast' },
  { emoji: '🚓', keywords: 'police car cop' },
  { emoji: '🚑', keywords: 'ambulance emergency' },
  { emoji: '🚒', keywords: 'fire engine' },
  { emoji: '✈️', keywords: 'airplane flight travel' },
  { emoji: '🚀', keywords: 'rocket space launch' },
  { emoji: '🛸', keywords: 'ufo alien space future' },
  { emoji: '⛵', keywords: 'sailboat ship sea' },
  { emoji: '🚢', keywords: 'ship cruise ocean' },
  { emoji: '🌃', keywords: 'night city stars' },
  { emoji: '🎠', keywords: 'carousel fun ride' },
  { emoji: '🎡', keywords: 'ferris wheel fun' },
  { emoji: '🎢', keywords: 'roller coaster thrill' },
  // Symbols
  { emoji: '❤️', keywords: 'heart love like red' },
  { emoji: '🧡', keywords: 'heart orange love' },
  { emoji: '💛', keywords: 'heart yellow love' },
  { emoji: '💚', keywords: 'heart green love' },
  { emoji: '💙', keywords: 'heart blue love' },
  { emoji: '💜', keywords: 'heart purple love' },
  { emoji: '🖤', keywords: 'heart black love dark' },
  { emoji: '🤍', keywords: 'heart white love pure' },
  { emoji: '🤎', keywords: 'heart brown love' },
  { emoji: '💗', keywords: 'heart pink growing love' },
  { emoji: '💓', keywords: 'heart beating love' },
  { emoji: '💞', keywords: 'hearts revolving love' },
  { emoji: '💕', keywords: 'two hearts love' },
  { emoji: '💌', keywords: 'love letter heart' },
  { emoji: '💘', keywords: 'heart arrow cupid' },
  { emoji: '💝', keywords: 'heart ribbon gift love' },
  { emoji: '❌', keywords: 'x cross no error' },
  { emoji: '⭕', keywords: 'circle o correct' },
  { emoji: '✔️', keywords: 'check mark ok' },
  { emoji: '❓', keywords: 'question mark' },
  { emoji: '❗', keywords: 'exclamation mark alert' },
  { emoji: '‼️', keywords: 'double exclamation' },
  { emoji: '⚠️', keywords: 'warning caution alert' },
  { emoji: '🚫', keywords: 'no prohibited ban' },
  { emoji: '🔞', keywords: 'no under 18' },
  { emoji: '♻️', keywords: 'recycle green environment' },
  { emoji: '✳️', keywords: 'asterisk star' },
  { emoji: '❇️', keywords: 'sparkle star' },
  { emoji: '🔰', keywords: 'beginner japanese' },
  { emoji: '♾️', keywords: 'infinity endless loop' },
  { emoji: '🔴', keywords: 'red circle dot' },
  { emoji: '🟠', keywords: 'orange circle dot' },
  { emoji: '🟡', keywords: 'yellow circle dot' },
  { emoji: '🟢', keywords: 'green circle dot' },
  { emoji: '🔵', keywords: 'blue circle dot' },
  { emoji: '🟣', keywords: 'purple circle dot' },
  { emoji: '⚫', keywords: 'black circle dot' },
  { emoji: '⚪', keywords: 'white circle dot' },
  { emoji: '🟤', keywords: 'brown circle dot' },
  { emoji: '🔶', keywords: 'orange diamond large' },
  { emoji: '🔷', keywords: 'blue diamond large' },
  { emoji: '🔸', keywords: 'orange diamond small' },
  { emoji: '🔹', keywords: 'blue diamond small' },
  { emoji: '🔺', keywords: 'red triangle up' },
  { emoji: '🔻', keywords: 'red triangle down' },
  { emoji: '💠', keywords: 'diamond blue' },
  { emoji: '🔘', keywords: 'radio button' },
  { emoji: '🔲', keywords: 'black square button' },
  { emoji: '🔳', keywords: 'white square button' },
  { emoji: '▶️', keywords: 'play button right' },
  { emoji: '⏩', keywords: 'fast forward' },
  { emoji: '⏪', keywords: 'rewind backward' },
  { emoji: '⏫', keywords: 'fast up' },
  { emoji: '⏬', keywords: 'fast down' },
  { emoji: '⏭️', keywords: 'next track' },
  { emoji: '⏮️', keywords: 'previous track' },
  { emoji: '⏯️', keywords: 'play pause' },
  { emoji: '🔀', keywords: 'shuffle random' },
  { emoji: '🔁', keywords: 'repeat loop' },
  { emoji: '🔂', keywords: 'repeat once' },
  { emoji: '🔔', keywords: 'bell notification' },
  { emoji: '🔕', keywords: 'bell mute silent' },
  { emoji: '📢', keywords: 'loudspeaker announce' },
  { emoji: '📣', keywords: 'megaphone cheer' },
  { emoji: '🔊', keywords: 'speaker loud volume' },
  { emoji: '🔇', keywords: 'muted speaker quiet' },
  { emoji: '💬', keywords: 'speech bubble comment' },
  { emoji: '💭', keywords: 'thought bubble think' },
  { emoji: '🗯️', keywords: 'anger bubble' },
  { emoji: '📢', keywords: 'announce broadcast' },
  { emoji: '🏁', keywords: 'checkered flag finish' },
  { emoji: '🚩', keywords: 'red flag warning' },
  { emoji: '🎌', keywords: 'crossed flags japan' },
  { emoji: '🏳️', keywords: 'white flag peace' },
  { emoji: '🏴', keywords: 'black flag' },
  { emoji: '🇯🇵', keywords: 'japan flag jp' },
  { emoji: '🇺🇸', keywords: 'usa america flag us' },
  { emoji: '🌀', keywords: 'cyclone swirl spin' },
  { emoji: '♠️', keywords: 'spade card suit' },
  { emoji: '♥️', keywords: 'heart card suit' },
  { emoji: '♦️', keywords: 'diamond card suit' },
  { emoji: '♣️', keywords: 'club card suit' },
  { emoji: '🃏', keywords: 'joker wild card' },
  { emoji: '#️⃣', keywords: 'hash number' },
  { emoji: '*️⃣', keywords: 'asterisk star' },
  { emoji: '0️⃣', keywords: 'zero number' },
  { emoji: '1️⃣', keywords: 'one number' },
  { emoji: '2️⃣', keywords: 'two number' },
  { emoji: '3️⃣', keywords: 'three number' },
  { emoji: '🔤', keywords: 'abc letters input' },
  { emoji: '🔡', keywords: 'abcd small letters' },
  { emoji: '🔠', keywords: 'ABCD capital letters' },
  // Extra popular
  { emoji: '💯', keywords: 'hundred points perfect' },
  { emoji: '🆗', keywords: 'ok button' },
  { emoji: '🆘', keywords: 'sos emergency help' },
  { emoji: '🆙', keywords: 'up button update' },
  { emoji: '🆕', keywords: 'new button fresh' },
  { emoji: '🆚', keywords: 'vs versus compare' },
  { emoji: '🉐', keywords: 'bargain japanese' },
  { emoji: '🈴', keywords: 'pass japanese' },
  { emoji: '📛', keywords: 'name badge id' },
  { emoji: '⛎', keywords: 'ophiuchus zodiac' },
  { emoji: '🌀', keywords: 'swirl cyclone dizzy' },
  { emoji: '〰️', keywords: 'wavy dash line' },
  { emoji: '〽️', keywords: 'part alternation mark' },
];

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
  triggerClassName?: string;
};

export const EmojiPicker = ({
  value,
  onChange,
  triggerClassName,
}: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 280;
    const popoverHeight = 280;
    const margin = 8;

    const spaceBelow = window.innerHeight - rect.bottom;
    let top =
      spaceBelow >= popoverHeight + margin
        ? rect.bottom + margin
        : Math.max(margin, rect.top - popoverHeight - margin);

    // Clamp within viewport
    top = Math.min(top, window.innerHeight - popoverHeight - margin);
    top = Math.max(top, margin);

    const left = Math.min(rect.left, window.innerWidth - popoverWidth - margin);

    setPopoverStyle({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    searchRef.current?.focus();

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScroll = () => updatePosition();

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const filtered = search.trim()
    ? EMOJIS.filter(
        ({ emoji, keywords }) =>
          keywords.includes(search.toLowerCase()) || emoji.includes(search),
      )
    : EMOJIS;

  return (
    <div className="emoji-picker">
      <button
        ref={triggerRef}
        type="button"
        className={`emoji-picker__trigger${triggerClassName ? ` ${triggerClassName}` : ''}`}
        onClick={() => {
          setOpen((o) => !o);
          setSearch('');
        }}
        aria-label="Select emoji"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {value || '📝'}
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="emoji-picker__popover"
            role="dialog"
            aria-label="Emoji picker"
            style={popoverStyle}
          >
            <input
              ref={searchRef}
              type="text"
              className="emoji-picker__search"
              placeholder="Search emojis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="emoji-picker__grid" role="listbox">
              {filtered.length > 0 ? (
                filtered.map(({ emoji }) => (
                  <button
                    key={emoji}
                    type="button"
                    role="option"
                    aria-selected={emoji === value}
                    className={`emoji-picker__item${emoji === value ? ' emoji-picker__item--selected' : ''}`}
                    onClick={() => {
                      onChange(emoji);
                      setOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))
              ) : (
                <p className="emoji-picker__empty">No results</p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
