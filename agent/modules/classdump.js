const { NSBundle, NSString } = ObjC.classes
const copyClassNamesForImage = new NativeFunction(
  Module.findExportByName(null, 'objc_copyClassNamesForImage'), 'pointer', ['pointer', 'pointer'])
const free = new NativeFunction(Module.findExportByName(null, 'free'), 'void', ['pointer'])

export function dump(path) {
  const filename = path || NSBundle.mainBundle().executablePath().toString()
  const image = Memory.allocUtf8String(filename)

  const p = Memory.alloc(Process.pointerSize)
  Memory.writeUInt(p, 0)
  const pClasses = copyClassNamesForImage(image, p)
  const count = Memory.readUInt(p)
  const classes = new Array(count)
  for (let i = 0; i < count; i++) {
    const pClassName = Memory.readPointer(pClasses.add(i * Process.pointerSize))
    classes[i] = Memory.readUtf8String(pClassName)
  }
  free(pClasses)
  return classes
}

const normalize = path => 
  NSString.stringWithString_(path).stringByResolvingAndStandardizingPath().toString()

export function ownClasses() {
  const bundle = normalize(NSBundle.mainBundle().bundlePath())
  return Process.enumerateModules()
    .filter(mod => normalize(mod.path).startsWith(bundle))
    .map(mod => dump(mod.path))
    .reduce((sum, item) => sum.concat(item), [])
}

export function inspect(clazz) {
  const proto = []
  let clz = ObjC.classes[clazz]
  if (!clz)
    throw new Error(`class ${clazz} not found`)

  while (clz = clz.$superClass)
    proto.unshift(clz.$className)

  return {
    methods: ObjC.classes[clazz].$ownMethods,
    proto
  }
}