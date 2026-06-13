# BE Controller → FE Inputs Extraction

How to read a BE controller + its DTOs and produce the structured inputs needed to drive the CRUD page build (`steps.md` consumes this).

This doc is **mapping-table-heavy** — designed for agent lookup, not linear reading.

---

## Input

The agent needs filesystem access to (at minimum):

1. The entity's controller file (e.g., `soar-module-system/.../user/UserController.java`)
2. All DTOs the controller references (`UserSaveReqDTO`, `UserPageReqDTO`, `UserRespDTO`, etc.) — usually under `<module>/controller/admin/<entity>/dto/`
3. The entity service interface (e.g., `AdminUserService.java`) — only for dict-type hints, not always needed
4. (Optional) Liquibase/Flyway migration introducing `tab_key` for the entity's menu — to verify menu seed exists

The agent does NOT need:

- Service implementation files (logic doesn't surface to FE)
- Mapper/Repository files
- Test files

---

## Output: extraction artifact

After reading BE files, produce this structured table. Don't write it to a file — keep in working memory + cite in summary at end. Format is YAML for clarity; agent may use any structured form.

```yaml
entity:        User                    # PascalCase singular
entityCamel:   user                    # camelCase singular for variable names
entityKebab:   user                    # kebab-case for file names
module:        system                  # lower
modulePascal:  System                  # for type prefixes if used
basePath:      /admin-api/system/user
tabKey:        system-user             # from system_menu.tab_key
componentPath: system/user/index       # from system_menu.component
selfProtection: true                   # see decisions.md

endpoints:
  page:          { method: GET,    path: /page,           perm: system:user:query           }
  get:           { method: GET,    path: /get,            perm: system:user:query           }
  create:        { method: POST,   path: /create,         perm: system:user:create          }
  update:        { method: PUT,    path: /update,         perm: system:user:update          }
  delete:        { method: DELETE, path: /delete,         perm: system:user:delete          }
  deleteList:    { method: DELETE, path: /delete-list,    perm: system:user:delete          } # optional
  updateStatus:  { method: PUT,    path: /update-status,  perm: system:user:update          } # optional
  updatePassword:{ method: PUT,    path: /update-password,perm: system:user:update-password } # optional

dtos:
  RespDTO:           # mirror of <Entity>RespDTO — table rows + form edit fetch
    fields:
      - { name: id,         tsType: number,   optional: false }
      - { name: username,   tsType: string,   optional: false }
      - { name: nickname,   tsType: string,   optional: false }
      - { name: deptId,     tsType: number,   optional: true  }
      - { name: deptName,   tsType: string,   optional: true, joined: true } # BE joins
      - { name: postIds,    tsType: number[], optional: true  }
      - { name: email,      tsType: string,   optional: true  }
      - { name: mobile,     tsType: string,   optional: true  }
      - { name: sex,        tsType: number,   optional: true,  dictType: user_sex     }
      - { name: avatar,     tsType: string,   optional: true  }
      - { name: status,     tsType: number,   optional: false, dictType: common_status }
      - { name: remark,     tsType: string,   optional: true  }
      - { name: loginIp,    tsType: string,   optional: true  }
      - { name: loginDate,  tsType: string,   optional: true, instant: true }
      - { name: createTime, tsType: string,   optional: false, instant: true }

  SaveReqDTO:        # mirror of <Entity>SaveReqDTO — create + update
    fields:
      - { name: id,        tsType: number,   optional: true  } # absent on create, set on update
      - { name: username,  tsType: string,   optional: false, rules: [required, minMax(4,30)] }
      - { name: password,  tsType: string,   optional: true,  rules: [requiredOnCreate, minMax(4,20)] }
      - { name: nickname,  tsType: string,   optional: false, rules: [required] }
      - { name: deptId,    tsType: number,   optional: true  }
      - { name: postIds,   tsType: number[], optional: true  }
      - { name: email,     tsType: string,   optional: true,  rules: [emailFormat] }
      - { name: mobile,    tsType: string,   optional: true  }
      - { name: sex,       tsType: number,   optional: true,  dictType: user_sex     }
      - { name: avatar,    tsType: string,   optional: true  }
      - { name: remark,    tsType: string,   optional: true  }

  PageReqDTO:        # mirror of <Entity>PageReqDTO — search form filters + pagination
    extends:         SortablePageParam     # or PageParam if not sortable
    fields:
      # excluding pageNo, pageSize, sortingFields (inherited)
      - { name: username,   tsType: string,        optional: true, search: like   }
      - { name: mobile,     tsType: string,        optional: true, search: like   }
      - { name: status,     tsType: number,        optional: true, search: exact, dictType: common_status }
      - { name: deptId,     tsType: number,        optional: true, search: exact  }
      - { name: createTime, tsType: [string,string],optional: true, search: range, instant: true, sizeAnno: '2,2' }

dictTypes:
  - common_status     # used by status field
  - user_sex          # used by sex field

permissions:
  query:          system:user:query
  create:         system:user:create
  update:         system:user:update
  delete:         system:user:delete
  updatePassword: system:user:update-password  # only if updatePassword endpoint exists

features:           # see decisions.md to apply these
  bulkDelete:    true   # deleteList endpoint exists
  statusToggle:  true   # updateStatus endpoint exists
  passwordReset: true   # updatePassword endpoint exists
  sortable:      true   # PageReqDTO extends SortablePageParam
  selfProtection: true  # entity is "User" — has current-user concept
```

---

## Extraction recipe

### Step 1: Endpoints from controller

Read controller file. Scan for these annotations:

| Find                                                            | Extract                                           |
| --------------------------------------------------------------- | ------------------------------------------------- |
| `@RequestMapping("/admin-api/...")`                             | `basePath`                                        |
| `@GetMapping("/X")` + method below                              | endpoint `GET basePath + /X`                      |
| `@PostMapping("/X")`                                            | endpoint POST                                     |
| `@PutMapping("/X")`                                             | endpoint PUT                                      |
| `@DeleteMapping("/X")`                                          | endpoint DELETE                                   |
| `@PreAuthorize("@ss.hasPermission('A:B:C')")` above each method | permission for that endpoint                      |
| Method signature: `public CommonResult<X> methodName(...)`      | response type `X` (after `CommonResult<>` unwrap) |
| Parameters: `@RequestBody YDto dto`                             | request body `YDto`                               |
| Parameters: `@RequestParam X id`                                | query param `X id`                                |
| Parameters: `@Valid`                                            | indicates BE validation runs                      |

Map endpoint paths to standard CRUD names by URL suffix:

- `/page` → `page`
- `/get` → `get`
- `/create` → `create`
- `/update` → `update`
- `/delete` → `delete`
- `/delete-list` → `deleteList`
- `/update-status` → `updateStatus`
- `/update-password` → `updatePassword`

Non-standard endpoints (e.g., `/import`, `/export-excel`, `/approve`) → flag for human review, this skill doesn't cover them.

### Step 2: DTO fields

For each DTO referenced in controller signatures, read the DTO file. Scan for fields with annotations.

Field shape:

```java
@Schema(description = "Username", example = "admin")
@NotBlank(message = "Username is required")
@Size(min = 4, max = 30, message = "...")
private String username;
```

Extract:

- Field name → `username`
- Java type → `String`
- Optional vs required (see "Optionality detection" below)
- Validation annotations → rules (see "Validation mapping" below)
- `@Schema(description=...)` → hint for form label or dict type
- Default value (if any, `private X field = default`)

### Step 3: Type mapping (Java → TS)

| Java type                                          | TS type                               | Notes                                                                                                       |
| -------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Long`, `long`                                     | `number`                              | JS Number safe up to 2^53; BE IDs stay under                                                                |
| `Integer`, `int`, `Short`, `short`, `Byte`, `byte` | `number`                              |                                                                                                             |
| `Double`, `double`, `Float`, `float`               | `number`                              |                                                                                                             |
| `BigDecimal`                                       | `number`                              | **Precision warning**: for currency / high-precision math, prefer string. Default to number for most cases. |
| `String`                                           | `string`                              |                                                                                                             |
| `Boolean`, `boolean`                               | `boolean`                             |                                                                                                             |
| `Character`, `char`                                | `string`                              |                                                                                                             |
| `Instant`, `ZonedDateTime`, `OffsetDateTime`       | `string` (ISO)                        | Mark `instant: true` for rendering                                                                          |
| `LocalDateTime`                                    | `string` (ISO)                        | Mark `instant: true`                                                                                        |
| `LocalDate`                                        | `string` (`'YYYY-MM-DD'`)             | Mark `date: true`                                                                                           |
| `LocalTime`                                        | `string` (`'HH:mm:ss'`)               | Rare                                                                                                        |
| `List<X>`, `Collection<X>`, `Set<X>`               | `X[]`                                 | Recursive                                                                                                   |
| `Map<K, V>`                                        | `Record<K, V>`                        | Rare — BE usually flattens                                                                                  |
| Custom DTO `<Y>`                                   | `<Y>`                                 | Define matching TS interface                                                                                |
| Enum class                                         | `number` (ordinal) OR `string` (name) | Check BE serialization config; Soar default is ordinal/number                                               |
| `Object`                                           | `unknown`                             | Should be rare — flag for review                                                                            |

### Step 4: Optionality detection

A field is **optional** in TS (`field?: type`) if any of:

- Has `@Schema(required = false)` (explicit)
- Has no validation annotation AND no explicit default
- Is a wrapper type (`Long`, `Integer`, `Boolean`) without `@NotNull`
- Is a primitive type with explicit default

A field is **required** (no `?`) if:

- Has `@NotNull` / `@NotBlank` / `@NotEmpty` annotation
- Is a primitive (`long`, `int`, `boolean`) without explicit default (BE will reject null)
- Has `@Schema(required = true)`

When in doubt: prefer optional — TS forgives, BE will validate runtime.

### Step 5: Validation mapping (BE annotation → antd Form rule)

| BE annotation                                            | antd Form rule                                                                               | Notes                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------- |
| `@NotBlank`                                              | `{ required: true, whitespace: true, message: t('...required') }`                            | String fields          |
| `@NotNull`                                               | `{ required: true, message: t('...required') }`                                              | Any field              |
| `@NotEmpty`                                              | `{ required: true, message: t('...required') }`                                              | Collections + strings  |
| `@Size(min=A, max=B)`                                    | `{ min: A, max: B, message: t('...length') }`                                                | Strings + collections  |
| `@Length(min=A, max=B)`                                  | Same as `@Size`                                                                              | String only            |
| `@Email`                                                 | `{ type: 'email', message: t('...emailInvalid') }`                                           |                        |
| `@Pattern(regexp="^X$")`                                 | `{ pattern: /^X$/, message: t('...patternInvalid') }`                                        | Translate regex syntax |
| `@Min(N)`, `@Max(N)`                                     | numerical bounds (use with `<InputNumber>`)                                                  | For number fields      |
| `@DecimalMin`, `@DecimalMax`                             | Same                                                                                         |                        |
| `@Digits(integer=A, fraction=B)`                         | `<InputNumber precision={B}>` + validation                                                   |                        |
| `@Past`, `@PastOrPresent`, `@Future`, `@FutureOrPresent` | DatePicker `disabledDate` prop                                                               |                        |
| `@AssertTrue` / `@AssertFalse` (custom)                  | Often custom — check method body; for `isPasswordValid` style, treat as conditional required |                        |

### Step 6: Form input type derivation

Given a DTO field's TS type + name + dict association:

| Conditions                                                     | Input component                   |
| -------------------------------------------------------------- | --------------------------------- |
| `tsType: boolean`                                              | `<Switch>`                        |
| `tsType: string`, name contains `password`                     | `<Input.Password>`                |
| `tsType: string`, name contains `email` OR `@Email` annotation | `<Input>` (with email rule)       |
| `tsType: string`, name contains `mobile` / `phone` / `tel`     | `<Input>` (with optional pattern) |
| `tsType: string`, no @Size or @Size.max > 200                  | `<Input.TextArea rows={3}>`       |
| `tsType: string`, any other                                    | `<Input>`                         |
| `tsType: number`, has `dictType`                               | `<DictSelect dictType="...">`     |
| `tsType: number`, name is `deptId` or refers to dept           | `<DeptTreeSelect>`                |
| `tsType: number[]`, name is `postIds` or refers to posts       | `<PostSelect mode="multiple">`    |
| `tsType: number`, no dict, no FK                               | `<InputNumber>`                   |
| `tsType: string` with `instant: true`                          | `<DatePicker showTime>`           |
| `tsType: string` with `date: true` (LocalDate)                 | `<DatePicker>` (no time)          |
| `tsType: [string, string]` with `instant: true`                | `<DatePicker.RangePicker>`        |
| `tsType: string[]` (free-form tags)                            | `<Select mode="tags">`            |

### Step 7: Dict type detection

`dictType` association is **NOT** always declared explicitly. Heuristics ordered by reliability:

1. **Service layer reference** (most reliable): grep service file for `DictDataUtil.parseDictDataValue` or `getDictDataLabel` calls. The string passed is the dict type.
2. **BE seed migration**: search Flyway migrations for `system_dict_data` inserts. If `(dict_type, label, value)` matches the field's expected values, it's a match.
3. **Field name convention** (heuristic, verify):
   - `status` (most entities) → `common_status`
   - `sex`, `gender` → `user_sex`
   - `type` (varies) → entity-specific (`<module>_<entity>_type`)
4. **`@Schema(description = "...")` content**: sometimes mentions the dict.

If dict type cannot be determined: flag for human review. Don't guess — using wrong dict type breaks display (`<DictTag>` won't find label) and search (filter never matches).

### Step 8: Search field detection (for PageReqDTO)

In `<Entity>PageReqDTO`, identify which fields the page should expose in search form:

| BE field                                    | Search type | Form input                                    |
| ------------------------------------------- | ----------- | --------------------------------------------- |
| `String name` (or similar identifier field) | LIKE        | `<Input>` with `placeholder="Search by name"` |
| `Integer status` (dict-typed)               | exact       | `<DictSelect>`                                |
| `Long deptId` (FK)                          | exact       | `<DeptTreeSelect>` (or specific picker)       |
| `Instant[] createTime` (`@Size(2,2)`)       | range       | `<DatePicker.RangePicker>`                    |
| `LocalDate[] fooDate` (`@Size(2,2)`)        | range       | `<DatePicker.RangePicker>` (no time)          |
| `Long roleId` (FK)                          | exact       | Specific picker for the FK entity             |

**Skip** in search form:

- `id` (handled by detail fetch, not list filter)
- `pageNo`, `pageSize`, `sortingFields` (managed by `useTableState`)
- Fields with no BE filter logic (some DTOs declare fields but service ignores) — when in doubt, include; harmless if BE ignores
- Sensitive fields (passwords, secrets) — never

### Step 9: Self-protection detection

Self-protection is required ONLY when the entity has a "current user" concept:

- Entity is `User`, `Admin`, `Member`, `Account` — yes
- Entity has FK to user table that represents the acting user — usually no for entity itself
- Other entities (Role, Dept, Post, Dict, Menu) — no

When `selfProtection: true`, the page enforces 4 places (see `steps.md` for code):

- Switch column disabled for own row
- Delete button disabled for own row
- Checkbox disabled for own row (no bulk delete self)
- Edit + Reset Password REMAIN enabled (own profile, own password change)

---

## Worked example: User entity

Walking through `UserController.java` extraction:

```java
@RestController
@RequestMapping("/admin-api/system/user")            // → basePath
public class UserController {

    @GetMapping("/page")                              // → endpoint
    @PreAuthorize("@ss.hasPermission('system:user:query')")  // → perm
    public CommonResult<PageResult<UserRespDTO>> getUserPage(@Valid UserPageReqDTO reqDTO) {
        // ...
    }

    @PostMapping("/create")
    @PreAuthorize("@ss.hasPermission('system:user:create')")
    public CommonResult<Long> createUser(@Valid @RequestBody UserSaveReqDTO reqDTO) {
        // ...
    }
    // ... etc
}
```

Reads as:

- `basePath: /admin-api/system/user`
- `page`: GET, `/page`, perm `system:user:query`, response `PageResult<UserRespDTO>`
- `create`: POST, `/create`, perm `system:user:create`, response `Long` (new id)

Then read `UserSaveReqDTO.java`:

```java
public class UserSaveReqDTO {
    @Schema(description = "User id, set on update")
    private Long id;                                  // optional (no @NotNull)

    @Schema(description = "Username", required = true)
    @NotBlank(message = "Username is required")
    @Size(min = 4, max = 30, message = "Username must be 4-30 chars")
    private String username;                          // required, rules: NotBlank + Size

    @Schema(description = "Password — required on create only")
    private String password;                          // optional (special validation via @AssertTrue elsewhere)

    @NotBlank(message = "Nickname is required")
    private String nickname;                          // required

    @Schema(description = "Department id")
    private Long deptId;                              // optional

    @Schema(description = "Post ids")
    private Set<Long> postIds;                        // optional, → number[]

    @Email(message = "Invalid email")
    private String email;                             // optional, rules: emailFormat

    private String mobile;                            // optional
    private Integer sex;                              // optional → dict user_sex (heuristic — verify)
    private String avatar;                            // optional
    private String remark;                            // optional
}
```

Produces SaveReqDTO entry in extraction artifact (see Output section).

Service layer check for `sex` dict confirmation:

```bash
# grep AdminUserServiceImpl.java
grep -n "sex" AdminUserServiceImpl.java
```

If finds e.g. `DictDataUtil.parseDictDataValue("user_sex", reqDTO.getSex())` → confirmed.

If not found explicitly but BE seed has `INSERT INTO system_dict_data (dict_type, ...) VALUES ('user_sex', 'Male', '1'), ('user_sex', 'Female', '2')` → confirmed.

---

## Edge cases + gotchas

### Polymorphic DTOs

If BE uses `@JsonTypeInfo` for polymorphism, this skill doesn't cover. Flag for human design.

### Nested DTOs

A field like `private AddressDTO address;` where `AddressDTO` has nested structure. Approach:

- TS type: `address?: AddressDTO`
- Form input: usually a nested `Form.Item` group, or flatten to multiple top-level form fields (BE accepts both shapes)
- Decide per-case — `decisions.md` doesn't pick a default

### File upload fields

`private String avatar; // upload URL`. Field type is string (URL after upload), but form input is an upload widget, not Input. Soar doesn't have a shared upload component yet — separate skill needed.

### Cross-entity reference fields beyond dept/post

E.g., `private Long parentRoleId;` referring to another role. No shared `<RoleSelect>` exists in foundation. Two options:

- Build a one-off picker inline (rendering a Select fetching from `/role/simple-list`)
- Build a shared `<RoleSelect>` foundation component first (Rule of Three)

For the first occurrence, inline is fine. After 3rd cross-entity FK without shared component, build foundation.

### Multi-permission endpoints

Sometimes one endpoint requires combined permissions: `@PreAuthorize("@ss.hasPermission('A') and @ss.hasPermission('B')")`. Extract both; FE uses `<HasPermission codes={['A', 'B']} mode="all">`.

### Custom validator annotations

BE may define custom validators (e.g., `@ValidUsername`). Check the validator class to understand the rule; if simple (e.g., regex), translate to antd `pattern` rule. If complex (e.g., DB lookup), let BE handle — FE doesn't pre-check.

### Missing `@Schema` documentation

If BE field has no `@Schema(description=...)`, agent must derive label from field name. Convert camelCase to "Title Case": `deptId` → "Department" (use FK semantic, not "Dept Id"); `createTime` → "Created At"; `loginIp` → "Login IP".

---

## Quality gates

After extraction, agent self-checks:

- [ ] Every endpoint has method + path + permission + request + response identified
- [ ] Every DTO field has TS type + optionality + (if applicable) dict/rules info
- [ ] No `tsType: any` or `unknown` (flag for review)
- [ ] No `dictType: unknown` (flag for review)
- [ ] No endpoint method that isn't recognized (`/import`, `/export-excel` flagged for human)
- [ ] Permission codes are exact strings, no typos
- [ ] If `selfProtection: true`, entity is user-like (sanity check)

If any quality gate fails, **pause and ask human** before proceeding to `decisions.md`. Producing incomplete or wrong inputs creates fan-out errors in the build.

---

## Output handoff

Pass the extraction artifact (in-memory or copied to scratch file) to `decisions.md`. That doc consumes the `features` map + DTO field types to decide which UI variants to include.
